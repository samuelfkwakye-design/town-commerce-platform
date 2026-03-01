import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AdminKeyGuard } from '../../auth/admin-key.guard';
import { AdminRefundsService } from './admin.refunds.service';
import { ApproveRefundDto } from './dto/approve-refund.dto';
import { MarkRefundPaidDto } from './dto/mark-refund-paid.dto';
import { RejectRefundDto } from './dto/reject-refund.dto';

@Controller('admin/refunds')
@UseGuards(AdminKeyGuard)
export class AdminRefundsController {
  constructor(private readonly service: AdminRefundsService) {}

  // GET /api/v1/admin/refunds?status=REQUESTED&orderId=...&townId=...
  @Get()
  list(
    @Query('status') status?: string,
    @Query('orderId') orderId?: string,
    @Query('townId') townId?: string,
    @Query('take') take?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.service.list({
      status,
      orderId,
      townId,
      take: take ? Number(take) : undefined,
      cursor: cursor ?? undefined,
    });
  }

  // GET /api/v1/admin/refunds/:id
  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  // PATCH /api/v1/admin/refunds/:id/approve
  // INTERNAL: mark SUCCESS immediately
  // PAYOUT: keep REQUESTED but mark as approved + payout details (pending payment)
  @Patch(':id/approve')
  approve(@Param('id') id: string, @Body() dto: ApproveRefundDto) {
    return this.service.approve(id, dto);
  }

  // PATCH /api/v1/admin/refunds/:id/mark-paid
  // For PAYOUT refunds: marks SUCCESS and stores payout reference
  @Patch(':id/mark-paid')
  markPaid(@Param('id') id: string, @Body() dto: MarkRefundPaidDto) {
    return this.service.markPaid(id, dto);
  }

  // PATCH /api/v1/admin/refunds/:id/reject
  @Patch(':id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectRefundDto) {
    return this.service.reject(id, dto);
  }
}
