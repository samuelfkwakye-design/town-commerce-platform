import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private extractClientReference(body: any): string | null {
    return (
      body?.ClientReference ??
      body?.clientReference ??
      body?.Data?.ClientReference ??
      body?.data?.clientReference ??
      null
    );
  }

  private extractTransactionId(body: any): string | null {
    return (
      body?.TransactionId ??
      body?.transactionId ??
      body?.Data?.TransactionId ??
      body?.data?.transactionId ??
      null
    );
  }

  private isSuccess(body: any): boolean {
    const responseCode = body?.ResponseCode ?? body?.responseCode ?? null;
    const status = String(body?.Status ?? body?.status ?? '').toUpperCase().trim();

    if (responseCode === '0000') return true;
    if (status === 'SUCCESS' || status === 'SUCCEEDED') return true;

    return false;
  }

  async handleHubtelWebhook(body: any) {
    const clientReference = this.extractClientReference(body);
    const txId = this.extractTransactionId(body);

    if (!clientReference && !txId) {
      throw new BadRequestException('Webhook missing ClientReference/TransactionId');
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [
          clientReference ? { clientReference } : undefined,
          txId ? { hubtelTransactionId: txId } : undefined,
        ].filter(Boolean) as any,
      },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found for webhook payload');
    }

    // Only MOMO payments should be driven by webhook
    if (payment.method !== PaymentMethod.MOMO) {
      throw new BadRequestException('Webhook only allowed for MOMO payments');
    }

    // Only goods payments should settle orders
    if (payment.purpose !== 'COD_GOODS') {
      throw new BadRequestException('Webhook only supported for COD_GOODS purpose');
    }

    // Idempotency: if already SUCCESS, do nothing
    if (payment.status === PaymentStatus.SUCCESS) {
      return {
        ok: true,
        paymentId: payment.id,
        paymentStatus: payment.status,
        orderId: payment.orderId,
        orderSettled: payment.order.status === OrderStatus.SETTLED,
        message: 'Already SUCCESS (idempotent)',
      };
    }

    const success = this.isSuccess(body);

    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        hubtelTransactionId: payment.hubtelTransactionId ?? txId ?? undefined,
        hubtelResponse: body,
        status: success ? PaymentStatus.SUCCESS : PaymentStatus.FAILED,
      },
    });

    let orderSettled = false;

    if (
      success &&
      payment.order.status === OrderStatus.FULFILLED &&
      payment.order.goodsPaymentMethod === PaymentMethod.MOMO
    ) {
      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.SETTLED },
      });
      orderSettled = true;
    }

    return {
      ok: true,
      paymentId: updatedPayment.id,
      paymentStatus: updatedPayment.status,
      orderId: payment.orderId,
      orderSettled,
    };
  }
}
