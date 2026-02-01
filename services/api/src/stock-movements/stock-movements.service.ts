import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, StockMovementReason } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ListStockMovementsQueryDto } from './dto/list-stock-movements.query.dto';

type Cursor = { createdAt: Date; id: string };

function parseCursor(cursor?: string): Cursor | undefined {
  if (!cursor) return undefined;
  const [createdAtIso, id] = cursor.split('|');
  if (!createdAtIso || !id) throw new BadRequestException('Invalid cursor format');
  const d = new Date(createdAtIso);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid cursor date');
  return { createdAt: d, id };
}

function toCursor(sm: { createdAt: Date; id: string }) {
  return `${sm.createdAt.toISOString()}|${sm.id}`;
}

@Injectable()
export class StockMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: ListStockMovementsQueryDto) {
    const limit = Math.min(Math.max(q.limit ?? 50, 1), 200);
    const cursor = parseCursor(q.cursor);

    const where: Prisma.StockMovementWhereInput = {
      ...(q.townProductId ? { townProductId: q.townProductId } : {}),
      ...(q.reason ? { reason: q.reason } : {}),
      ...(q.orderId ? { orderId: q.orderId } : {}),
      ...(q.refundId ? { refundId: q.refundId } : {}),
      ...(q.from || q.to
        ? {
            createdAt: {
              ...(q.from ? { gte: new Date(q.from) } : {}),
              ...(q.to ? { lte: new Date(q.to) } : {}),
            },
          }
        : {}),
    };

    /**
     * Seek pagination for orderBy (createdAt desc, id desc)
     *
     * Next page condition:
     *   createdAt < cursor.createdAt
     *   OR (createdAt = cursor.createdAt AND id < cursor.id)
     */
    const seekWhere: Prisma.StockMovementWhereInput | undefined = cursor
      ? {
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { lt: cursor.id } },
          ],
        }
      : undefined;

    const finalWhere: Prisma.StockMovementWhereInput = seekWhere
      ? { AND: [where, seekWhere] }
      : where;

    const rows = await this.prisma.stockMovement.findMany({
      where: finalWhere,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasNextPage = rows.length > limit;
    const items = hasNextPage ? rows.slice(0, limit) : rows;
    const nextCursor = hasNextPage ? toCursor(items[items.length - 1]) : null;

    return {
      items,
      pageInfo: { limit, hasNextPage, nextCursor },
    };
  }

  async adjust(dto: AdjustStockDto) {
    const { townProductId, deltaQty, deltaWeightGrams, note } = dto;

    const hasQty = typeof deltaQty === 'number';
    const hasWg = typeof deltaWeightGrams === 'number';

    if ((hasQty && hasWg) || (!hasQty && !hasWg)) {
      throw new BadRequestException('Provide exactly one of deltaQty or deltaWeightGrams');
    }

    return this.prisma.$transaction(async (tx) => {
      const tp = await tx.townProduct.findUnique({
        where: { id: townProductId },
        select: {
          id: true,
          pricingModel: true,
          stockQty: true,
          stockWeightGrams: true,
        },
      });

      if (!tp) throw new BadRequestException('TownProduct not found');

      if (tp.pricingModel === 'UNIT' && !hasQty) {
        throw new BadRequestException('UNIT products require deltaQty');
      }
      if (tp.pricingModel === 'WEIGHT' && !hasWg) {
        throw new BadRequestException('WEIGHT products require deltaWeightGrams');
      }

      const currentQty = tp.stockQty ?? 0;
      const currentWg = tp.stockWeightGrams ?? 0;

      const newQty = hasQty ? currentQty + (deltaQty as number) : currentQty;
      const newWg = hasWg ? currentWg + (deltaWeightGrams as number) : currentWg;

      if (newQty < 0) throw new BadRequestException('Resulting stockQty cannot be negative');
      if (newWg < 0) throw new BadRequestException('Resulting stockWeightGrams cannot be negative');

      const updated = await tx.townProduct.update({
        where: { id: townProductId },
        data: {
          ...(hasQty ? { stockQty: newQty } : {}),
          ...(hasWg ? { stockWeightGrams: newWg } : {}),
        },
        select: {
          id: true,
          pricingModel: true,
          stockQty: true,
          stockWeightGrams: true,
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          townProductId,
          deltaQty: hasQty ? (deltaQty as number) : null,
          deltaWeightGrams: hasWg ? (deltaWeightGrams as number) : null,
          reason: StockMovementReason.MANUAL_ADJUSTMENT,
          note,
        },
      });

      return { townProduct: updated, stockMovement: movement };
    });
  }
}
