import { Body, Controller, Post, Headers, Query, UnauthorizedException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { GetPaymentStatusDto } from './dto/get-payment-status.dto';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly service: PaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  // POST /api/v1/payments/hubtel/webhook
  @Post('hubtel/webhook')
  hubtelWebhook(
    @Body() body: any,
    @Headers('x-webhook-secret') headerSecret?: string,
    @Query('secret') querySecret?: string,
  ) {
    const expected = (process.env.HUBTEL_WEBHOOK_SECRET ?? '').trim();
    const provided = (headerSecret ?? querySecret ?? '').trim();

    if (!expected || provided !== expected) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    return this.service.handleHubtelWebhook(body);
  }

  // POST /api/v1/payments/status
  @Post('status')
  async status(@Body() dto: GetPaymentStatusDto) {
    const payment = await this.prisma.payment.findFirst({
      where: { clientReference: dto.clientReference },
      include: { order: true },
    });

    if (!payment) {
      return { found: false };
    }

    return {
      found: true,
      paymentId: payment.id,
      paymentStatus: payment.status,
      orderId: payment.orderId,
      orderStatus: payment.order.status,
    };
  }
}
