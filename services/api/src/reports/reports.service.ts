import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StockValuationQueryDto } from './dto/stock-valuation.query.dto';
import { SetCostDto } from './dto/set-cost.dto';
import { ProfitReportQueryDto } from './dto/profit-report.query.dto';

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
  private csvEscape(value: any): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  // If contains comma, quote, or newline -> wrap in quotes and escape quotes
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

private toCsv(headers: string[], rows: Record<string, any>[]): string {
  const lines: string[] = [];
  lines.push(headers.map((h) => this.csvEscape(h)).join(','));
  for (const row of rows) {
    lines.push(headers.map((h) => this.csvEscape(row[h])).join(','));
  }
  return lines.join('\n') + '\n';
}

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
    async stockValuationCsv(q: any) {
  // Reuse existing JSON report
  const limit = Number(q.limit ?? 1000);

  const data = await this.stockValuation({ ...q, limit });

  // These columns must match what your stockValuation rows actually return.
  // If one column name differs, we’ll tweak it quickly after your first test.
  const headers = [
    'townProductId',
    'townId',
    'productId',
    'productName',
    'pricingModel',
    'stockQty',
    'stockWeightGrams',
    'snapshotValue',
    'ledgerValue',
    'diff',
    'isMismatch',
    'lastMovementAt',
  ];

  const csvRows = data.items.map((r: any) => ({
    ...r,
  }));

  // Totals row (if your valuation returns totals.*)
  if (data.totals) {
    csvRows.push({
      townProductId: 'TOTALS',
      townId: '',
      productId: '',
      productName: '',
      pricingModel: '',
      stockQty: '',
      stockWeightGrams: '',
      snapshotValue: data.totals.totalSnapshotValue ?? '',
      ledgerValue: data.totals.totalLedgerValue ?? '',
      diff: data.totals.diffValue ?? '',
      isMismatch: '',
      lastMovementAt: '',
    });
  }

  return this.toCsv(headers, csvRows);
}

  async getProfitReport(q: ProfitReportQueryDto) {
  const limit = Number(q.limit ?? 50);


  // Build WHERE filters (match your other report endpoints)
  const where: any = {};
  if (q.townId) where.townId = q.townId;
  if (q.townProductId) where.id = q.townProductId;
  if (q.pricingModel) where.pricingModel = q.pricingModel;

  // Pagination (cursor = TownProduct.id) — same pattern as stock valuation
  const townProducts = await this.prisma.townProduct.findMany({
    where,
    take: limit + 1,
    ...(q.cursor ? { skip: 1, cursor: { id: q.cursor } } : {}),
    orderBy: { id: 'asc' },
    include: {
      product: true, // if your relation name differs, adjust/remove
      town: true,    // optional; remove if not needed
    },
  });

  const hasNext = townProducts.length > limit;
  const page = hasNext ? townProducts.slice(0, limit) : townProducts;
  const nextCursor = hasNext ? page[page.length - 1]?.id : null;

  // Use your existing normaliser if you already have one in this file.
  // If you already have toNumber / normalizeDecimal in reports.service.ts,
  // then DELETE this helper and use your existing one instead.
  const toNumber = (v: any): number => {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'bigint') return Number(v);
    if (typeof v === 'number') return v;
    if (typeof v === 'string') return Number(v);
    if (typeof v?.toNumber === 'function') return v.toNumber();
    return Number(v);
  };

  let totalSellingValue = 0;
  let totalCostValue = 0;
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

  const rows = page.map((tp) => {
    const pricingModel = tp.pricingModel;

    const stockQty = Number(tp.stockQty ?? 0);
    const stockWeightGrams = Number(tp.stockWeightGrams ?? 0);

    const pricePerUnit = toNumber(tp.pricePerUnit);
    const pricePerKg = toNumber(tp.pricePerKg);

    const costPerUnit = toNumber(tp.costPerUnit);
    const costPerKg = toNumber(tp.costPerKg);

    let sellingValue = 0;
    let costValue = 0;

    if (pricingModel === 'UNIT') {
      sellingValue = stockQty * pricePerUnit;
      costValue = stockQty * costPerUnit;
    } else if (pricingModel === 'WEIGHT') {
      const kg = stockWeightGrams / 1000;
      sellingValue = kg * pricePerKg;
      costValue = kg * costPerKg;
    }

    const profit = sellingValue - costValue;
const marginPercent = sellingValue > 0 ? (profit / sellingValue) * 100 : 0;

const sellingValueR = round2(sellingValue);
const costValueR = round2(costValue);
const profitR = round2(profit);
const marginPercentR = round2(marginPercent);

totalSellingValue += sellingValueR;
totalCostValue += costValueR;

return {
  townProductId: tp.id,
  townId: tp.townId,
  productId: tp.productId,
  productName: tp.product?.name ?? null,
  pricingModel,

  stockQty,
  stockWeightGrams,

  sellingValue: sellingValueR,
  costValue: costValueR,
  profit: profitR,
  marginPercent: marginPercentR,
};
  });

  const totalProfit = round2(totalSellingValue - totalCostValue);
const totalMarginPercent =
  totalSellingValue > 0 ? round2((totalProfit / totalSellingValue) * 100) : 0;

return {
  rows,
  totals: {
    sellingValue: round2(totalSellingValue),
    costValue: round2(totalCostValue),
    profit: totalProfit,
    marginPercent: totalMarginPercent,
  },
  nextCursor,
};
}async profitCsv(q: any) {
  // Reuse existing JSON report (already rounded + paginated)
  // For CSV exports, we usually want a larger default limit.
  const limit = Number(q.limit ?? 1000);

  const data = await this.getProfitReport({ ...q, limit });

  const headers = [
    'townProductId',
    'townId',
    'productId',
    'productName',
    'pricingModel',
    'stockQty',
    'stockWeightGrams',
    'sellingValue',
    'costValue',
    'profit',
    'marginPercent',
  ];

  // rows already contain these keys
  const csvRows = data.rows.map((r: any) => ({
    ...r,
  }));

  // Add totals row at bottom (accountant-friendly)
  csvRows.push({
    townProductId: 'TOTALS',
    townId: '',
    productId: '',
    productName: '',
    pricingModel: '',
    stockQty: '',
    stockWeightGrams: '',
    sellingValue: data.totals.sellingValue,
    costValue: data.totals.costValue,
    profit: data.totals.profit,
    marginPercent: data.totals.marginPercent,
  });

  return this.toCsv(headers, csvRows);
}

async salesProfitCsv(q: any) {
  // We page through TownProducts in chunks, because SalesProfitQueryDto limit caps at 200.
  const pageLimit = Math.min(Math.max(Number(q.limit ?? 200), 1), 200);
  const maxRows = Number(q.maxRows ?? 5000); // safety guard for very large exports

  let cursor: string | null = q.cursor ?? null;

  const allRows: any[] = [];

  let revenue = 0;
  let cogs = 0;
  let profit = 0;

  while (true) {
    const data = await this.salesProfitReport({
      ...q,
      limit: pageLimit,
      cursor,
    });

    for (const r of data.rows) {
      allRows.push(r);
      revenue += Number(r.revenue ?? 0);
      cogs += Number(r.cogs ?? 0);
      profit += Number(r.profit ?? 0);
    }

    if (!data.pageInfo?.hasNextPage) break;

    cursor = data.pageInfo.nextCursor;

    // safety stop
    if (allRows.length >= maxRows) break;
  }

  const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;

  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

  const headers = [
    'townProductId',
    'townId',
    'townName',
    'townSlug',
    'productName',
    'pricingModel',
    'saleItemsCount',
    'revenue',
    'cogs',
    'profit',
    'marginPercent',
  ];

  const csvRows = allRows.map((r: any) => ({ ...r }));

  // Totals row at bottom (accountant-friendly)
  csvRows.push({
    townProductId: 'TOTALS',
    townId: '',
    townName: '',
    townSlug: '',
    productName: '',
    pricingModel: '',
    saleItemsCount: '',
    revenue: round2(revenue),
    cogs: round2(cogs),
    profit: round2(profit),
    marginPercent: round2(marginPercent),
  });

  return this.toCsv(headers, csvRows);
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
async salesProfitReport(q: any) {
  const limit = Math.min(Math.max(Number(q.limit ?? 50), 1), 200);

  const where: Prisma.SaleItemWhereInput = {
    ...(q.townProductId ? { townProductId: q.townProductId } : {}),
    ...(q.from || q.to
      ? {
          createdAt: {
            ...(q.from ? { gte: new Date(q.from) } : {}),
            ...(q.to ? { lte: new Date(q.to) } : {}),
          },
        }
      : {}),
  };

  // If filtering by townId, get townProductIds first
  if (q.townId) {
    const tps = await this.prisma.townProduct.findMany({
      where: { townId: q.townId },
      select: { id: true },
    });

    const ids = tps.map((x) => x.id);
    where.townProductId = { in: ids };
  }

  const tpPage = await this.prisma.townProduct.findMany({
    where: {
      ...(q.townId ? { townId: q.townId } : {}),
      ...(q.townProductId ? { id: q.townProductId } : {}),
    },
    orderBy: { id: 'asc' },
    take: limit + 1,
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      townId: true,
      pricingModel: true,
      product: { select: { name: true } },
      town: { select: { name: true, slug: true } },
    },
  });

  const hasNextPage = tpPage.length > limit;
  const page = hasNextPage ? tpPage.slice(0, limit) : tpPage;
  const nextCursor = hasNextPage ? page[page.length - 1].id : null;

  if (page.length === 0) {
    return {
      rows: [],
      totals: { revenue: 0, cogs: 0, profit: 0, marginPercent: 0 },
      pageInfo: { limit, hasNextPage: false, nextCursor: null },
    };
  }

  const pageIds = page.map((x) => x.id);

  const grouped = await this.prisma.saleItem.groupBy({
    by: ['townProductId'],
    where: {
      ...where,
      townProductId: { in: pageIds },
    },
    _sum: {
      revenue: true,
      cogs: true,
      profit: true,
    },
    _count: true,
  });

  const sumsByTp = new Map(
    grouped.map((g) => [
      g.townProductId,
      {
        revenue: Number(g._sum.revenue ?? 0),
        cogs: Number(g._sum.cogs ?? 0),
        profit: Number(g._sum.profit ?? 0),
        count: g._count ?? 0,
      },
    ]),
  );

  let totalRevenue = 0;
  let totalCogs = 0;
  let totalProfit = 0;

  const rows = page.map((tp) => {
    const s = sumsByTp.get(tp.id) ?? { revenue: 0, cogs: 0, profit: 0, count: 0 };

    totalRevenue += s.revenue;
    totalCogs += s.cogs;
    totalProfit += s.profit;

    const marginPercent = s.revenue > 0 ? (s.profit / s.revenue) * 100 : 0;

    return {
      townProductId: tp.id,
      townId: tp.townId,
      townName: tp.town?.name ?? null,
      townSlug: tp.town?.slug ?? null,

      productName: tp.product?.name ?? null,
      pricingModel: tp.pricingModel,

      saleItemsCount: s.count,
      revenue: Math.round((s.revenue + Number.EPSILON) * 100) / 100,
      cogs: Math.round((s.cogs + Number.EPSILON) * 100) / 100,
      profit: Math.round((s.profit + Number.EPSILON) * 100) / 100,
      marginPercent: Math.round((marginPercent + Number.EPSILON) * 100) / 100,
    };
  });

  // Optional filter: only show products that actually had sales
const filteredRows = q.onlyWithSales
  ? rows.filter((r) => r.saleItemsCount > 0)
  : rows;

// Recalculate totals if filtering is enabled
let revenue = 0;
let cogs = 0;
let profit = 0;

for (const r of filteredRows) {
  revenue += r.revenue;
  cogs += r.cogs;
  profit += r.profit;
}

const marginPercent =
  revenue > 0 ? (profit / revenue) * 100 : 0;

return {
  rows: filteredRows,
  totals: {
    revenue: Math.round((revenue + Number.EPSILON) * 100) / 100,
    cogs: Math.round((cogs + Number.EPSILON) * 100) / 100,
    profit: Math.round((profit + Number.EPSILON) * 100) / 100,
    marginPercent: Math.round((marginPercent + Number.EPSILON) * 100) / 100,
  },
  pageInfo: { limit, hasNextPage, nextCursor },
};

}

}
