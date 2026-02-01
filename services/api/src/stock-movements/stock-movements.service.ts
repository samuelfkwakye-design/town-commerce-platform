import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListStockMovementsQueryDto } from './dto/list-stock-movements.query.dto';
import { Prisma } from '@prisma/client';

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
     * Cursor paging with orderBy (createdAt desc, id desc)
     *
     * Prisma cursor expects a UNIQUE cursor.
     * If your StockMovement model has `id` as @id (unique), we can use cursor: { id }
     * BUT to maintain correct ordering when multiple rows share same createdAt,
     * we apply an extra `where` clause to implement “seek pagination”:
     *
     * For (createdAt desc, id desc), next page condition is:
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
      take: limit + 1, // fetch 1 extra to detect next page
    });

    const hasNextPage = rows.length > limit;
    const items = hasNextPage ? rows.slice(0, limit) : rows;
    const nextCursor = hasNextPage ? toCursor(items[items.length - 1]) : null;

    return {
      items,
      pageInfo: {
        limit,
        hasNextPage,
        nextCursor,
      },
    };
  }
}
