import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type ListQuery = {
  status?: string;
  townId?: string;
  q?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
};

@Injectable()
export class AdminOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: ListQuery) {
    const limit = Math.min(Math.max(Number(q.limit ?? 20), 1), 100);

    const where: any = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.townId ? { townId: q.townId } : {}),
      ...(q.from || q.to
        ? {
            createdAt: {
              ...(q.from ? { gte: new Date(q.from) } : {}),
              ...(q.to ? { lte: new Date(q.to) } : {}),
            },
          }
        : {}),
      ...(q.q
        ? {
            OR: [
              { id: { contains: q.q, mode: 'insensitive' } },
              { customerPhone: { contains: q.q, mode: 'insensitive' } },
              { customerEmail: { contains: q.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.order.findMany({
      where,
      take: limit + 1,
      ...(q.cursor ? { skip: 1, cursor: { id: q.cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        townId: true,
        customerPhone: true,
        customerEmail: true,

        // totals
        subtotal: true,
        total: true,
        payNowTotal: true,
        payOnDeliveryTotal: true,

        goodsPaymentMethod: true,

        // attach town name/slug for UI
        town: { select: { name: true, slug: true } },

        // latest payment snapshot (if any)
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            method: true,
            purpose: true,
            amount: true,
            currency: true,
          },
        },
      },
    });

    const hasNextPage = rows.length > limit;
    const items = hasNextPage ? rows.slice(0, limit) : rows;
    const nextCursor = hasNextPage ? items[items.length - 1]?.id ?? null : null;

    return {
      filters: {
        status: q.status ?? null,
        townId: q.townId ?? null,
        q: q.q ?? null,
        from: q.from ?? null,
        to: q.to ?? null,
      },
      items,
      pageInfo: { limit, hasNextPage, nextCursor },
    };
  }

  async get(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        town: { select: { id: true, name: true, slug: true } },
        items: {
          include: {
            townProduct: {
              include: {
                product: { select: { id: true, name: true } },
                town: { select: { id: true, name: true, slug: true } },
              },
            },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          include: { Refund: { include: { items: true } } },
        },
        sale: { include: { items: true } },
      },
    });

    if (!order) throw new NotFoundException(`Order not found: ${id}`);

    return order;
  }
  async markCodCollected(orderId: string, note?: string | null) {
  return this.prisma.order.update({
    where: { id: orderId },
    data: {
      // (only if your existing markCodCollected does more than this,
      // call the shared OrdersService instead — see 3B)
    },
  });
}

}
