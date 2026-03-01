import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RefundStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApproveRefundDto } from './dto/approve-refund.dto';
import { MarkRefundPaidDto } from './dto/mark-refund-paid.dto';
import { RejectRefundDto } from './dto/reject-refund.dto';

type ListArgs = {
  status?: string;
  orderId?: string;
  townId?: string;
  take?: number;
  cursor?: string;
};

@Injectable()
export class AdminRefundsService {
  constructor(private readonly prisma: PrismaService) {}

  private nowIso() {
    return new Date().toISOString();
  }

  private assertMode(mode: any): 'INTERNAL' | 'PAYOUT' {
    if (mode !== 'INTERNAL' && mode !== 'PAYOUT') {
      throw new BadRequestException('mode must be INTERNAL or PAYOUT');
    }
    return mode;
  }

  private assertPayoutMethod(method: any): 'MOMO' | 'CASH' {
    if (method !== 'MOMO' && method !== 'CASH') {
      throw new BadRequestException('payoutMethod must be MOMO or CASH');
    }
    return method;
  }

  private mergeJson(a: any, b: any) {
    const left = (a && typeof a === 'object') ? a : {};
    const right = (b && typeof b === 'object') ? b : {};
    return { ...left, ...right };
  }

  async list(args: ListArgs) {
    const take = Math.min(Math.max(args.take ?? 50, 1), 200);

    const where: Prisma.RefundWhereInput = {
      ...(args.status ? { status: args.status as any } : {}),
      ...(args.orderId ? { Payment: { orderId: args.orderId } } : {}),
      ...(args.townId ? { Payment: { order: { townId: args.townId } } } : {}),
    };

    const rows = await this.prisma.refund.findMany({
      where,
      take: take + 1,
      ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        Payment: {
          include: {
            order: { select: { id: true, townId: true, status: true, total: true, customerPhone: true } },
          },
        },
        items: true,
      },
    });

    const hasNext = rows.length > take;
    const data = hasNext ? rows.slice(0, take) : rows;
    const nextCursor = hasNext ? data[data.length - 1]?.id : null;

    return { data, page: { take, nextCursor } };
  }

  async get(id: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id },
      include: {
        Payment: { include: { order: true } },
        items: { include: { orderItem: true } },
      },
    });
    if (!refund) throw new NotFoundException(`Refund not found: ${id}`);
    return refund;
  }

  /**
   * Approve a refund.
   * - INTERNAL: instantly marks SUCCESS (provider=OPS)
   * - PAYOUT: keeps status REQUESTED but records approved + payout intent (provider=MANUAL_PAYOUT)
   */
  async approve(id: string, dto: ApproveRefundDto) {
    const mode = this.assertMode(dto.mode);

    const refund = await this.prisma.refund.findUnique({
      where: { id },
      include: { Payment: { include: { order: true } } },
    });
    if (!refund) throw new NotFoundException(`Refund not found: ${id}`);

    if (refund.status !== RefundStatus.REQUESTED) {
      throw new BadRequestException(`Only REQUESTED refunds can be approved. Current=${refund.status}`);
    }

    if (mode === 'INTERNAL') {
      const providerResponse = this.mergeJson(refund.providerResponse, {
        mode: 'INTERNAL',
        approvedAt: this.nowIso(),
        note: dto.note ?? null,
      });

      return this.prisma.refund.update({
        where: { id },
        data: {
          status: RefundStatus.SUCCESS,
          provider: 'OPS',
          providerResponse: providerResponse as any,
          updatedAt: new Date(),
        },
        include: { items: true, Payment: true },
      });
    }

    // PAYOUT approval: record intent, but do NOT mark SUCCESS until paid
    const payoutMethod = dto.payoutMethod ? this.assertPayoutMethod(dto.payoutMethod) : null;

    const providerResponse = this.mergeJson(refund.providerResponse, {
      mode: 'PAYOUT',
      approvedAt: this.nowIso(),
      payoutMethod,
      note: dto.note ?? null,
    });

    return this.prisma.refund.update({
      where: { id },
      data: {
        // keep REQUESTED until money is paid out
        provider: 'MANUAL_PAYOUT',
        providerResponse: providerResponse as any,
        updatedAt: new Date(),
      },
      include: { items: true, Payment: true },
    });
  }

  /**
   * Mark a PAYOUT refund as paid (finalize).
   * Sets status=SUCCESS and stores payoutRef/method.
   */
  async markPaid(id: string, dto: MarkRefundPaidDto) {
    const refund = await this.prisma.refund.findUnique({ where: { id } });
    if (!refund) throw new NotFoundException(`Refund not found: ${id}`);

    if (refund.status !== RefundStatus.REQUESTED) {
      throw new BadRequestException(`Only REQUESTED refunds can be marked paid. Current=${refund.status}`);
    }

    const payoutMethod = dto.payoutMethod ? this.assertPayoutMethod(dto.payoutMethod) : null;

    if (!dto.payoutRef || !dto.payoutRef.trim()) {
      throw new BadRequestException('payoutRef is required to mark a refund as paid');
    }

    const providerResponse = this.mergeJson(refund.providerResponse, {
      mode: 'PAYOUT',
      paidAt: this.nowIso(),
      payoutMethod,
      payoutRef: dto.payoutRef.trim(),
      note: dto.note ?? null,
    });

    return this.prisma.refund.update({
      where: { id },
      data: {
        status: RefundStatus.SUCCESS,
        provider: refund.provider ?? 'MANUAL_PAYOUT',
        providerRefundId: dto.payoutRef.trim(),
        providerResponse: providerResponse as any,
        updatedAt: new Date(),
      },
      include: { items: true, Payment: true },
    });
  }

  async reject(id: string, dto: RejectRefundDto) {
    const refund = await this.prisma.refund.findUnique({ where: { id } });
    if (!refund) throw new NotFoundException(`Refund not found: ${id}`);

    if (refund.status !== RefundStatus.REQUESTED) {
      throw new BadRequestException(`Only REQUESTED refunds can be rejected. Current=${refund.status}`);
    }

    const providerResponse = this.mergeJson(refund.providerResponse, {
      rejectedAt: this.nowIso(),
      reason: dto.reason ?? null,
      note: dto.note ?? null,
    });

    return this.prisma.refund.update({
      where: { id },
      data: {
        status: RefundStatus.FAILED, // using FAILED as “rejected” for now
        provider: 'OPS',
        providerResponse: providerResponse as any,
        updatedAt: new Date(),
      },
      include: { items: true, Payment: true },
    });
  }
}
