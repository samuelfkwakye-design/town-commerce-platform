import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StockValuationQueryDto } from './dto/stock-valuation.query.dto';
import { SetCostDto } from './dto/set-cost.dto';
function toNumber(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (typeof value === 'object' && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  return Number(value);
}

function toNumberOrNull(value: any, fieldLabel: string): number | null {
  if (value === null || value === undefined) return null;

  // Prisma Decimal often stringifies; Number() is fine for reporting
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new BadRequestException(`Invalid number for ${fieldLabel}`);
  }
  return n;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Stock valuation using SELLING PRICE from TownProduct:
   * - UNIT: qty * pricePerUnit
   * - WEIGHT: (grams/1000) * pricePerKg
   */
  async stockValuation(q: StockValuationQueryDto) {
    const limit = Math.min(Math.max(q.limit ?? 50, 1), 200);
    const mode: 'selling' | 'cost' = q.mode ?? 'selling';

    const tpWhere: Prisma.TownProductWhereInput = {
      ...(q.townId ? { townId: q.townId } : {}),
      ...(q.pricingModel ? { pricingModel: q.pricingModel } : {}),
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
        pricePerUnit: true,
        pricePerKg: true,
        costPerUnit: true,
        costPerKg: true,
        updatedAt: true,
        product: { select: { name: true } },
      },
    });

    const hasNextPage = townProducts.length > limit;
    const page = hasNextPage ? townProducts.slice(0, limit) : townProducts;
    const nextCursor = hasNextPage ? page[page.length - 1].id : null;

    if (page.length === 0) {
      return {
        items: [],
        totals: { totalSnapshotValue: 0, totalLedgerValue: 0, diffValue: 0 },
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

    const ledgerByTpId = new Map<string, { sumQty: number; sumWg: number; lastMovementAt: Date | null }>();
    for (const g of grouped) {
      ledgerByTpId.set(g.townProductId, {
        sumQty: (g._sum.deltaQty ?? 0) as number,
        sumWg: (g._sum.deltaWeightGrams ?? 0) as number,
        lastMovementAt: (g._max.createdAt ?? null) as Date | null,
      });
    }

    let totalSnapshotValue = 0;
    let totalLedgerValue = 0;

    const items = page
      .map((tp) => {
        const ledger = ledgerByTpId.get(tp.id) ?? { sumQty: 0, sumWg: 0, lastMovementAt: null };

        const snapshotQty = tp.stockQty ?? 0;
        const snapshotWg = tp.stockWeightGrams ?? 0;

        const ledgerQty = tp.pricingModel === 'UNIT' ? ledger.sumQty : 0;
        const ledgerWg = tp.pricingModel === 'WEIGHT' ? ledger.sumWg : 0;

        const isMismatch =
          (tp.pricingModel === 'UNIT' && snapshotQty !== ledgerQty) ||
          (tp.pricingModel === 'WEIGHT' && snapshotWg !== ledgerWg);

        // selling price selection
                const pricePerUnit = toNumberOrNull(tp.pricePerUnit, `TownProduct.pricePerUnit for townProductId=${tp.id}`);
        const pricePerKg = toNumberOrNull(tp.pricePerKg, `TownProduct.pricePerKg for townProductId=${tp.id}`);
        const costPerUnit = toNumberOrNull(tp.costPerUnit, `TownProduct.costPerUnit for townProductId=${tp.id}`);
        const costPerKg = toNumberOrNull(tp.costPerKg, `TownProduct.costPerKg for townProductId=${tp.id}`);

        const unitRate =
          mode === 'selling'
            ? tp.pricingModel === 'UNIT'
              ? pricePerUnit
              : pricePerKg
            : tp.pricingModel === 'UNIT'
              ? costPerUnit
              : costPerKg;

        const unitRateLabel =
          mode === 'selling'
            ? tp.pricingModel === 'UNIT'
              ? 'pricePerUnit'
              : 'pricePerKg'
            : tp.pricingModel === 'UNIT'
              ? 'costPerUnit'
              : 'costPerKg';

        if (unitRate === null) {
          throw new BadRequestException(`Missing ${unitRateLabel} for townProductId=${tp.id} (mode=${mode})`);
        }

        const snapshotValue =
          tp.pricingModel === 'UNIT'
            ? snapshotQty * unitRate
            : (snapshotWg / 1000) * unitRate;

        const ledgerValue =
          tp.pricingModel === 'UNIT'
            ? ledgerQty * unitRate
            : (ledgerWg / 1000) * unitRate;

        totalSnapshotValue += snapshotValue;
        totalLedgerValue += ledgerValue;

        return {
          townProductId: tp.id,
          townId: tp.townId,
          productId: tp.productId,
          productName: tp.product?.name ?? null,
          pricingModel: tp.pricingModel,

          pricePerUnit: tp.pricingModel === 'UNIT' ? toNumber(pricePerUnit) : null,
          pricePerKg: tp.pricingModel === 'WEIGHT' ? toNumber(pricePerKg) : null,

          costPerUnit: tp.pricingModel === 'UNIT' ? toNumber(costPerUnit) : null,
          costPerKg: tp.pricingModel === 'WEIGHT' ? toNumber(costPerKg) : null,

          rateUsed: toNumber(unitRate),
          snapshotValue: toNumber(snapshotValue),
          ledgerValue: toNumber(ledgerValue),
          diffValue: toNumber(snapshotValue - ledgerValue),

          isMismatch,
          lastMovementAt: ledger.lastMovementAt,
          snapshotUpdatedAt: tp.updatedAt,
        };
      })
      .filter((row) => (q.onlyMismatches ? row.isMismatch : true));

    return {
      items,
      totals: {
        totalSnapshotValue: toNumber(totalSnapshotValue),
        totalLedgerValue: toNumber(totalLedgerValue),
        diffValue: toNumber(totalSnapshotValue - totalLedgerValue),
},

      pageInfo: { limit, hasNextPage, nextCursor },
    };
  }
    async setCost(dto: SetCostDto) {
    const { townProductId, costPerUnit, costPerKg, note } = dto;

    if ((costPerUnit == null && costPerKg == null) || (costPerUnit != null && costPerKg != null)) {
      throw new BadRequestException('Provide exactly one of costPerUnit or costPerKg');
    }

    const tp = await this.prisma.townProduct.findUnique({
      where: { id: townProductId },
      select: { id: true, pricingModel: true },
    });

    if (!tp) {
      throw new BadRequestException('TownProduct not found');
    }

    if (tp.pricingModel === 'UNIT' && costPerUnit == null) {
      throw new BadRequestException('UNIT products require costPerUnit');
    }

    if (tp.pricingModel === 'WEIGHT' && costPerKg == null) {
      throw new BadRequestException('WEIGHT products require costPerKg');
    }

    const updated = await this.prisma.townProduct.update({
      where: { id: townProductId },
      data: {
        ...(costPerUnit != null ? { costPerUnit } : {}),
        ...(costPerKg != null ? { costPerKg } : {}),
      },
    });

    return {
  townProductId: updated.id,
  pricingModel: updated.pricingModel,
  costPerUnit: updated.costPerUnit === null ? null : Number(updated.costPerUnit),
  costPerKg: updated.costPerKg === null ? null : Number(updated.costPerKg),
  note: note ?? null,
};

  }

}
