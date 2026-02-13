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

  private round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ISO week helper (UTC-based)
private getISOWeekKey(d: Date) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // Thursday in current week decides the year.
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const year = date.getUTCFullYear();
  const ww = String(weekNo).padStart(2, '0');
  return `${year}-W${ww}`;
}

private getDayKey(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

private getMonthKey(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

private async townProductIdsForTown(townId: string) {
  const tps = await this.prisma.townProduct.findMany({
    where: { townId },
    select: { id: true },
  });
  return tps.map(x => x.id);
}

async salesSummary(q: any) {
  const where: Prisma.SaleItemWhereInput = {
    ...(q.from || q.to
      ? {
          createdAt: {
            ...(q.from ? { gte: new Date(q.from) } : {}),
            ...(q.to ? { lte: new Date(q.to) } : {}),
          },
        }
      : {}),
  };

  if (q.townId) {
    const ids = await this.townProductIdsForTown(q.townId);
    where.townProductId = { in: ids };
  }

  const agg = await this.prisma.saleItem.aggregate({
    where,
    _sum: { revenue: true, cogs: true, profit: true },
    _count: true,
  });

  // distinct “sales count” (roughly: number of delivered orders) using groupBy saleId
  const salesGroups = await this.prisma.saleItem.groupBy({
    by: ['saleId'],
    where,
    _count: true,
  });

  const revenue = Number(agg._sum.revenue ?? 0);
  const cogs = Number(agg._sum.cogs ?? 0);
  const profit = Number(agg._sum.profit ?? 0);
  const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    filters: {
      from: q.from ?? null,
      to: q.to ?? null,
      townId: q.townId ?? null,
    },
    totals: {
      revenue: this.round2(revenue),
      cogs: this.round2(cogs),
      profit: this.round2(profit),
      marginPercent: this.round2(marginPercent),
    },
    counts: {
      saleItemsCount: Number(agg._count ?? 0),
      salesCount: salesGroups.length, // distinct saleId
    },
  };
}
async topProducts(q: any) {
  const limit = Math.min(Math.max(Number(q.limit ?? 10), 1), 50);
  const metric: 'profit' | 'revenue' | 'margin' | 'saleItemsCount' = q.metric ?? 'profit';

  const where: Prisma.SaleItemWhereInput = {
    ...(q.from || q.to
      ? {
          createdAt: {
            ...(q.from ? { gte: new Date(q.from) } : {}),
            ...(q.to ? { lte: new Date(q.to) } : {}),
          },
        }
      : {}),
  };

  // Optional town filter via townProductIds
  if (q.townId) {
    const ids = await this.townProductIdsForTown(q.townId); // you already added this helper
    where.townProductId = { in: ids };
  }

  // Aggregate by TownProduct (this is your product-in-a-town SKU)
  const grouped = await this.prisma.saleItem.groupBy({
    by: ['townProductId'],
    where,
    _sum: {
      revenue: true,
      cogs: true,
      profit: true,
    },
    _count: true,
  });

  if (grouped.length === 0) {
    return {
      filters: {
        from: q.from ?? null,
        to: q.to ?? null,
        townId: q.townId ?? null,
        metric,
        limit,
      },
      rows: [],
    };
  }

  // Decorate with names (Town + Product) by fetching TownProduct records
  const tpIds = grouped.map((g) => g.townProductId);

  const tps = await this.prisma.townProduct.findMany({
    where: { id: { in: tpIds } },
    select: {
      id: true,
      townId: true,
      pricingModel: true,
      town: { select: { name: true, slug: true } },
      product: { select: { name: true } },
    },
  });

  const tpMap = new Map(tps.map((tp) => [tp.id, tp]));

  // Build rows
  const rows = grouped.map((g) => {
    const revenue = Number(g._sum.revenue ?? 0);
    const cogs = Number(g._sum.cogs ?? 0);
    const profit = Number(g._sum.profit ?? 0);
    const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;
    const saleItemsCount = Number(g._count ?? 0);

    const tp = tpMap.get(g.townProductId);

    return {
      townProductId: g.townProductId,
      townId: tp?.townId ?? null,
      townName: tp?.town?.name ?? null,
      townSlug: tp?.town?.slug ?? null,
      productName: tp?.product?.name ?? null,
      pricingModel: tp?.pricingModel ?? null,

      saleItemsCount,
      revenue: this.round2(revenue),
      cogs: this.round2(cogs),
      profit: this.round2(profit),
      marginPercent: this.round2(marginPercent),
    };
  });

  // Sort by requested metric
  const sorted = rows.sort((a, b) => {
    if (metric === 'profit') return b.profit - a.profit;
    if (metric === 'revenue') return b.revenue - a.revenue;
    if (metric === 'margin') return b.marginPercent - a.marginPercent;
    return b.saleItemsCount - a.saleItemsCount;
  });

  return {
    filters: {
      from: q.from ?? null,
      to: q.to ?? null,
      townId: q.townId ?? null,
      metric,
      limit,
    },
    rows: sorted.slice(0, limit),
  };
}
async topProductsCsv(q: any) {
  const data = await this.topProducts(q);

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

  return this.toCsv(headers, data.rows);
}

async salesTimeseries(q: any) {
  const bucket: 'day' | 'week' | 'month' = q.bucket ?? 'day';

  const where: Prisma.SaleItemWhereInput = {
    ...(q.from || q.to
      ? {
          createdAt: {
            ...(q.from ? { gte: new Date(q.from) } : {}),
            ...(q.to ? { lte: new Date(q.to) } : {}),
          },
        }
      : {}),
  };

  if (q.townId) {
    const ids = await this.townProductIdsForTown(q.townId);
    where.townProductId = { in: ids };
  }

  // Pull the minimum fields we need, then bucket in JS (safe & deterministic)
  const items = await this.prisma.saleItem.findMany({
    where,
    select: {
      createdAt: true,
      revenue: true,
      cogs: true,
      profit: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const map = new Map<string, { revenue: number; cogs: number; profit: number; count: number }>();

  for (const it of items) {
    const d = it.createdAt;
    const key =
      bucket === 'day'
        ? this.getDayKey(d)
        : bucket === 'week'
          ? this.getISOWeekKey(d)
          : this.getMonthKey(d);

    const revenue = Number(it.revenue ?? 0);
    const cogs = Number(it.cogs ?? 0);
    const profit = Number(it.profit ?? 0);

    const cur = map.get(key) ?? { revenue: 0, cogs: 0, profit: 0, count: 0 };
    cur.revenue += revenue;
    cur.cogs += cogs;
    cur.profit += profit;
    cur.count += 1;
    map.set(key, cur);
  }

  const rows = Array.from(map.entries())
    .map(([period, v]) => {
      const marginPercent = v.revenue > 0 ? (v.profit / v.revenue) * 100 : 0;
      return {
        period,
        saleItemsCount: v.count,
        revenue: this.round2(v.revenue),
        cogs: this.round2(v.cogs),
        profit: this.round2(v.profit),
        marginPercent: this.round2(marginPercent),
      };
    })
    .sort((a, b) => (a.period < b.period ? -1 : a.period > b.period ? 1 : 0));

  return {
    filters: {
      from: q.from ?? null,
      to: q.to ?? null,
      townId: q.townId ?? null,
      bucket,
    },
    rows,
  };
}

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
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const chunk = <T>(arr: T[], size: number) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
};

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
const baseWhere: Prisma.SaleItemWhereInput = { ...where };

  // If filtering by townId, get townProductIds first
  let townProductIdsForTown: string[] | null = null;

if (q.townId) {
  const tps = await this.prisma.townProduct.findMany({
    where: { townId: q.townId },
    select: { id: true },
  });

  townProductIdsForTown = tps.map((x) => x.id);

  // apply to both "where" (used for page groupBy) and "baseWhere" (used for grandTotals)
  where.townProductId = { in: townProductIdsForTown };
  baseWhere.townProductId = { in: townProductIdsForTown };
}
let grandTotals: null | {
  revenue: number;
  cogs: number;
  profit: number;
  marginPercent: number;
  saleItemsCount: number;
} = null;

if (q.grandTotals) {
  // If we have a potentially large IN(...) list, aggregate in chunks
  if (townProductIdsForTown && townProductIdsForTown.length > 0) {
    let sumRevenue = 0;
    let sumCogs = 0;
    let sumProfit = 0;
    let count = 0;

    const chunks = chunk(townProductIdsForTown, 500);

    for (const ids of chunks) {
      const agg = await this.prisma.saleItem.aggregate({
        where: {
          ...baseWhere,
          townProductId: { in: ids },
        },
        _sum: { revenue: true, cogs: true, profit: true },
        _count: true,
      });

      sumRevenue += Number(agg._sum.revenue ?? 0);
      sumCogs += Number(agg._sum.cogs ?? 0);
      sumProfit += Number(agg._sum.profit ?? 0);
      count += Number(agg._count ?? 0);
    }

    const mp = sumRevenue > 0 ? (sumProfit / sumRevenue) * 100 : 0;

    grandTotals = {
      revenue: round2(sumRevenue),
      cogs: round2(sumCogs),
      profit: round2(sumProfit),
      marginPercent: round2(mp),
      saleItemsCount: count,
    };
  } else {
    // No big IN(...) case → one clean aggregate
    const agg = await this.prisma.saleItem.aggregate({
      where: baseWhere,
      _sum: { revenue: true, cogs: true, profit: true },
      _count: true,
    });

    const sumRevenue = Number(agg._sum.revenue ?? 0);
    const sumCogs = Number(agg._sum.cogs ?? 0);
    const sumProfit = Number(agg._sum.profit ?? 0);
    const mp = sumRevenue > 0 ? (sumProfit / sumRevenue) * 100 : 0;

    grandTotals = {
      revenue: round2(sumRevenue),
      cogs: round2(sumCogs),
      profit: round2(sumProfit),
      marginPercent: round2(mp),
      saleItemsCount: Number(agg._count ?? 0),
    };
  }
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
  grandTotals,
};

}

}
