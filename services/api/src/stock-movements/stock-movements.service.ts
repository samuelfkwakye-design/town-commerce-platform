import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, StockMovementReason } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ListStockMovementsQueryDto } from './dto/list-stock-movements.query.dto';
import { ReconcileStockQueryDto } from './dto/reconcile-stock.query.dto';
import { BaselineFromSnapshotDto } from './dto/baseline-from-snapshot.dto';

type Cursor = { createdAt: Date; id: string };

function parseCursor(cursor?: string): Cursor | undefined {
  if (!cursor) return undefined;
  const [createdAtIso, id] = cursor.split('|');
  if (!createdAtIso || !id) {
    throw new BadRequestException('Invalid cursor format');
  }
  const d = new Date(createdAtIso);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException('Invalid cursor date');
  }
  return { createdAt: d, id };
}

function toCursor(sm: { createdAt: Date; id: string }) {
  return `${sm.createdAt.toISOString()}|${sm.id}`;
}

@Injectable()
export class StockMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  // ===============================
  // LIST STOCK MOVEMENTS (PUBLIC)
  // ===============================
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
      pageInfo: {
        limit,
        hasNextPage,
        nextCursor,
      },
    };
      
  }

  // ===============================
  // MANUAL ADJUSTMENT (ADMIN)
  // ===============================
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

      if (!tp) {
        throw new BadRequestException('TownProduct not found');
      }

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

      if (newQty < 0) {
        throw new BadRequestException('Resulting stockQty cannot be negative');
      }

      if (newWg < 0) {
        throw new BadRequestException('Resulting stockWeightGrams cannot be negative');
      }

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

      return {
        townProduct: updated,
        stockMovement: movement,
      };
    });
  }
    async baselineFromSnapshot(dto: BaselineFromSnapshotDto) {
    const { townId, townProductId, note } = dto;

    if (townId && townProductId) {
      throw new BadRequestException('Provide only one of townId or townProductId');
    }
    if (!townId && !townProductId) {
      throw new BadRequestException('Provide townId or townProductId');
    }

    const where: Prisma.TownProductWhereInput = {
      ...(townId ? { townId } : {}),
      ...(townProductId ? { id: townProductId } : {}),
    };

    const tps = await this.prisma.townProduct.findMany({
      where,
      select: {
        id: true,
        townId: true,
        productId: true,
        pricingModel: true,
        stockQty: true,
        stockWeightGrams: true,
      },
    });

    if (tps.length === 0) {
      throw new BadRequestException('No TownProducts found for the given filter');
    }

    const ids = tps.map((t) => t.id);

    const grouped = await this.prisma.stockMovement.groupBy({
      by: ['townProductId'],
      where: { townProductId: { in: ids } },
      _sum: { deltaQty: true, deltaWeightGrams: true },
    });

    const ledgerByTpId = new Map<string, { sumQty: number; sumWg: number }>();
    for (const g of grouped) {
      ledgerByTpId.set(g.townProductId, {
        sumQty: (g._sum.deltaQty ?? 0) as number,
        sumWg: (g._sum.deltaWeightGrams ?? 0) as number,
      });
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const createdRows: any[] = [];

      for (const tp of tps) {
        const ledger = ledgerByTpId.get(tp.id) ?? { sumQty: 0, sumWg: 0 };

        const snapshotQty = tp.stockQty ?? 0;
        const snapshotWg = tp.stockWeightGrams ?? 0;

        if (tp.pricingModel === 'UNIT') {
          const baselineDelta = snapshotQty - ledger.sumQty;
          if (baselineDelta !== 0) {
            const row = await tx.stockMovement.create({
              data: {
                townProductId: tp.id,
                deltaQty: baselineDelta,
                deltaWeightGrams: null,
                reason: StockMovementReason.MANUAL_ADJUSTMENT,
                note: note ?? 'Baseline from snapshot',
              },
            });
            createdRows.push({
              townProductId: tp.id,
              pricingModel: 'UNIT',
              baselineDeltaQty: baselineDelta,
              stockMovementId: row.id,
            });
          }
        } else {
          const baselineDelta = snapshotWg - ledger.sumWg;
          if (baselineDelta !== 0) {
            const row = await tx.stockMovement.create({
              data: {
                townProductId: tp.id,
                deltaQty: null,
                deltaWeightGrams: baselineDelta,
                reason: StockMovementReason.MANUAL_ADJUSTMENT,
                note: note ?? 'Baseline from snapshot',
              },
            });
            createdRows.push({
              townProductId: tp.id,
              pricingModel: 'WEIGHT',
              baselineDeltaWeightGrams: baselineDelta,
              stockMovementId: row.id,
            });
          }
        }
      }

      return createdRows;
    });

    return {
      scope: townProductId ? { townProductId } : { townId },
      createdCount: created.length,
      created,
    };
  }

  // ===============================
  // RECONCILIATION (ADMIN)
  // ===============================
  async reconcile(q: ReconcileStockQueryDto) {
    const limit = Math.min(Math.max(q.limit ?? 50, 1), 200);

    const tpWhere: Prisma.TownProductWhereInput = {
      ...(q.townId ? { townId: q.townId } : {}),
      ...(q.townProductId ? { id: q.townProductId } : {}),
    };

    const townProducts = await this.prisma.townProduct.findMany({
      where: tpWhere,
      orderBy: { id: 'asc' },
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      take: limit + 1,
      select: {
        id: true,
        townId: true,
        productId: true,
        pricingModel: true,
        stockQty: true,
        stockWeightGrams: true,
        updatedAt: true,
      },
    });

    const hasNextPage = townProducts.length > limit;
    const page = hasNextPage ? townProducts.slice(0, limit) : townProducts;
    const nextCursor = hasNextPage ? page[page.length - 1].id : null;

    if (page.length === 0) {
      return {
        items: [],
        pageInfo: { limit, hasNextPage: false, nextCursor: null },
      };
    }

    const ids = page.map((tp) => tp.id);

    const grouped = await this.prisma.stockMovement.groupBy({
      by: ['townProductId'],
      where: { townProductId: { in: ids } },
      _sum: { deltaQty: true, deltaWeightGrams: true },
      _max: { createdAt: true },
    });

    const ledgerByTpId = new Map<
      string,
      { sumQty: number; sumWg: number; lastMovementAt: Date | null }
    >();

    for (const g of grouped) {
      ledgerByTpId.set(g.townProductId, {
        sumQty: (g._sum.deltaQty ?? 0) as number,
        sumWg: (g._sum.deltaWeightGrams ?? 0) as number,
        lastMovementAt: (g._max.createdAt ?? null) as Date | null,
      });
    }

    const items = page
      .map((tp) => {
        const ledger = ledgerByTpId.get(tp.id) ?? {
          sumQty: 0,
          sumWg: 0,
          lastMovementAt: null,
        };

        const snapshotQty = tp.stockQty ?? 0;
        const snapshotWg = tp.stockWeightGrams ?? 0;

        const ledgerQty = tp.pricingModel === 'UNIT' ? ledger.sumQty : 0;
        const ledgerWg = tp.pricingModel === 'WEIGHT' ? ledger.sumWg : 0;

        const diffQty = tp.pricingModel === 'UNIT' ? snapshotQty - ledgerQty : null;
        const diffWg = tp.pricingModel === 'WEIGHT' ? snapshotWg - ledgerWg : null;

        const isMismatch =
          (tp.pricingModel === 'UNIT' && diffQty !== 0) ||
          (tp.pricingModel === 'WEIGHT' && diffWg !== 0);

        return {
          townProductId: tp.id,
          townId: tp.townId,
          productId: tp.productId,
          pricingModel: tp.pricingModel,
          snapshotQty: tp.pricingModel === 'UNIT' ? snapshotQty : null,
          ledgerQty: tp.pricingModel === 'UNIT' ? ledgerQty : null,
          diffQty,
          snapshotWeightGrams: tp.pricingModel === 'WEIGHT' ? snapshotWg : null,
          ledgerWeightGrams: tp.pricingModel === 'WEIGHT' ? ledgerWg : null,
          diffWeightGrams: diffWg,
          lastMovementAt: ledger.lastMovementAt,
          snapshotUpdatedAt: tp.updatedAt,
          isMismatch,
        };
      })
      .filter((row) => (q.onlyMismatches ? row.isMismatch : true));

    return {
      items,
      pageInfo: { limit, hasNextPage, nextCursor },
    };
  }
}
