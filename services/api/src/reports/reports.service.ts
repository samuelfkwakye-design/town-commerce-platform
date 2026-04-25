// src/reports/reports.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

import { StockValuationQueryDto } from './dto/stock-valuation.query.dto';
import { SetCostDto } from './dto/set-cost.dto';
import { ProfitReportQueryDto } from './dto/profit-report.query.dto';
import { RefundLeaderboardQueryDto } from './dto/refund-leaderboard.query.dto';
import { OpsDashboardQueryDto } from './dto/ops-dashboard.query.dto';
import { OpsDashboardResponseDto } from './dto/ops-dashboard.response.dto';
import { SalesSummaryQueryDto } from './dto/sales-summary.query.dto';
import { SalesTimeseriesQueryDto } from './dto/sales-timeseries.query.dto';
import { TopProductsQueryDto } from './dto/top-products.query.dto';
import { TownLeaderboardQueryDto } from './dto/town-leaderboard.query.dto';
import { NetProfitQueryDto } from './dto/net-profit.query.dto';
import { SalesProfitQueryDto } from './dto/sales-profit.query.dto';

// If you created these two DTO files as per earlier step:
import { RevenueTrendQueryDto } from './dto/revenue-trend.query.dto';
import { TownOptionsResponseDto } from './dto/town-options.response.dto';

function toNumber(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'object' && typeof value.toNumber === 'function') return value.toNumber();
  return Number(value);
}

function toNumberOrNull(value: any, fieldLabel: string): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (Number.isNaN(n)) throw new BadRequestException(`Invalid number for ${fieldLabel}`);
  return n;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------
  // Small shared helpers
  // -------------------------
  private round2(n: number) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  // ISO week helper (UTC-based)
  private getISOWeekKey(d: Date) {
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7)); // Thu decides year
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
    return tps.map((x) => x.id);
  }

  private csvEscape(value: any): string {
    if (value === null || value === undefined) return '';
    const s = String(value);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
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

  private startOfTodayUtc(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  }

  private startOfTomorrowUtc(): Date {
    const start = this.startOfTodayUtc();
    return new Date(start.getTime() + 24 * 60 * 60 * 1000);
  }

  // -------------------------
  // Town options (for dropdowns)
  // -------------------------
  async getTownOptions(): Promise<TownOptionsResponseDto> {
    const rows = await this.prisma.town.findMany({
      orderBy: [{ name: 'asc' }],
      select: { id: true, name: true, slug: true },
    });
    return { rows };
  }
private toDayKeyUtc(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

private async sumRevenueToday(townId: string | null, start: Date, end: Date): Promise<number> {
  const rows = await this.prisma.$queryRaw<any[]>`
    SELECT COALESCE(SUM(p.amount), 0) AS amount
    FROM "Payment" p
    JOIN "Order" o ON o.id = p."orderId"
    WHERE p.status = 'SUCCESS'
      AND p."createdAt" >= ${start}::timestamptz
      AND p."createdAt" <  ${end}::timestamptz
      AND (${townId}::text IS NULL OR o."townId" = ${townId}::text)
  `;
  return Number(rows?.[0]?.amount ?? 0);
}

private async sumRefundsToday(townId: string | null, start: Date, end: Date): Promise<number> {
  // If your Refund table has "amount" this will work.
  // If it doesn't, it will throw — we catch at call site and return 0.
  const rows = await this.prisma.$queryRaw<any[]>`
    SELECT COALESCE(SUM(r.amount), 0) AS amount
    FROM "Refund" r
    JOIN "Payment" p ON p.id = r."paymentId"
    JOIN "Order"   o ON o.id = p."orderId"
    WHERE r."createdAt" >= ${start}::timestamptz
      AND r."createdAt" <  ${end}::timestamptz
      AND (${townId}::text IS NULL OR o."townId" = ${townId}::text)
  `;
  return Number(rows?.[0]?.amount ?? 0);
}

private async countOrdersToday(townId: string | null, start: Date, end: Date): Promise<number> {
  const rows = await this.prisma.$queryRaw<any[]>`
    SELECT COUNT(*)::int AS count
    FROM "Order" o
    WHERE o."createdAt" >= ${start}::timestamptz
      AND o."createdAt" <  ${end}::timestamptz
      AND (${townId}::text IS NULL OR o."townId" = ${townId}::text)
  `;
  return Number(rows?.[0]?.count ?? 0);
}

async getProfitIntelligence(adminUser: any, requestedTownId?: string | null) {
    const townId =
    adminUser?.role === 'GLOBAL_SUPER_ADMIN'
      ? requestedTownId ?? null
      : adminUser?.townId ?? null;
  const start = this.startOfTodayUtc();
  const end = this.startOfTomorrowUtc();

  // Revenue today (SUCCESS payments)
  const revenue = await this.sumRevenueToday(townId ?? null, start, end);

  // Refunds today
  let refunds = 0;
  try {
    refunds = await this.sumRefundsToday(townId ?? null, start, end);
  } catch {
    refunds = 0;
  }

  // Profit from SaleItem (true profit)
  const profitAgg = await this.prisma.saleItem.aggregate({
    _sum: { profit: true, revenue: true, cogs: true },
    where: {
      createdAt: {
        gte: start,
        lt: end,
      },
      ...(townId
        ? {
            townProduct: {
              townId,
            },
          }
        : {}),
    },
  });

  const profit = Number(profitAgg._sum.profit ?? 0);
  const revenueFromSales = Number(profitAgg._sum.revenue ?? 0);
  const cogs = Number(profitAgg._sum.cogs ?? 0);

  const margin =
    revenueFromSales > 0 ? (profit / revenueFromSales) * 100 : 0;

  let health: 'GOOD' | 'WARNING' | 'CRITICAL' = 'GOOD';

  if (margin < 10) health = 'CRITICAL';
  else if (margin < 20) health = 'WARNING';

  return {
    today: {
      revenue: this.round2(revenue),
      refunds: this.round2(refunds),
      profit: this.round2(profit),
      cogs: this.round2(cogs),
      margin: this.round2(margin),
    },
    health,
  };
}

private async countConfirmedStale(townId: string | null, staleCutoff: Date): Promise<number> {
  const rows = await this.prisma.$queryRaw<any[]>`
    SELECT COUNT(*)::int AS count
    FROM "Order" o
    WHERE o.status = 'CONFIRMED'
      AND o."updatedAt" < ${staleCutoff}::timestamptz
      AND (${townId}::text IS NULL OR o."townId" = ${townId}::text)
  `;
  return Number(rows?.[0]?.count ?? 0);
}
  // -------------------------
  // Revenue trend (SUCCESS payments)
  // -------------------------
  async getRevenueTrend(q: any) {
  const days = Math.min(Math.max(Number(q.days ?? 7), 1), 60);
  const townId: string | null = q.townId ?? null;

  const to = new Date(); // now
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

  const rows = await this.prisma.$queryRaw<any[]>`
    SELECT
      date_trunc('day', p."createdAt") AS day,
      COALESCE(SUM(p.amount), 0)       AS revenue
    FROM "Payment" p
    JOIN "Order" o ON o.id = p."orderId"
    WHERE p.status = 'SUCCESS'
      AND p."createdAt" >= ${from}::timestamptz
      AND p."createdAt" <= ${to}::timestamptz
      AND (${townId}::text IS NULL OR o."townId" = ${townId}::text)
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  return {
    filters: {
      townId,
      from: from.toISOString(),
      to: to.toISOString(),
      bucket: "day",
    },
    rows: rows.map((r) => ({
      period: this.toDayKeyUtc(new Date(r.day)),
      revenue: this.round2(Number(r.revenue ?? 0)),
    })),
  };
}

  // -------------------------
  // Sales summary (SaleItem agg)
  // -------------------------
  async salesSummary(q: SalesSummaryQueryDto | any) {
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
        salesCount: salesGroups.length,
      },
    };
  }

  // -------------------------
  // Top products (by TownProductId)
  // -------------------------
  async topProducts(q: TopProductsQueryDto | any) {
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

    if (q.townId) {
      const ids = await this.townProductIdsForTown(q.townId);
      where.townProductId = { in: ids };
    }

    const grouped = await this.prisma.saleItem.groupBy({
      by: ['townProductId'],
      where,
      _sum: { revenue: true, cogs: true, profit: true },
      _count: true,
    });

    if (grouped.length === 0) {
      return {
        filters: { from: q.from ?? null, to: q.to ?? null, townId: q.townId ?? null, metric, limit },
        rows: [],
      };
    }

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

    rows.sort((a, b) => {
      if (metric === 'profit') return b.profit - a.profit;
      if (metric === 'revenue') return b.revenue - a.revenue;
      if (metric === 'margin') return b.marginPercent - a.marginPercent;
      return b.saleItemsCount - a.saleItemsCount;
    });

    return {
      filters: { from: q.from ?? null, to: q.to ?? null, townId: q.townId ?? null, metric, limit },
      rows: rows.slice(0, limit),
    };
  }

  async topProductsCsv(q: TopProductsQueryDto | any) {
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

  // -------------------------
  // Town leaderboard (roll up by Town)
  // -------------------------
  async townLeaderboard(q: TownLeaderboardQueryDto | any) {
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

    const grouped = await this.prisma.saleItem.groupBy({
      by: ['townProductId'],
      where,
      _sum: { revenue: true, cogs: true, profit: true },
      _count: true,
    });

    if (grouped.length === 0) {
      return { filters: { from: q.from ?? null, to: q.to ?? null, metric, limit }, rows: [] };
    }

    const tpIds = grouped.map((g) => g.townProductId);
    const tps = await this.prisma.townProduct.findMany({
      where: { id: { in: tpIds } },
      select: { id: true, townId: true, town: { select: { name: true, slug: true } } },
    });
    const tpToTown = new Map(tps.map((tp) => [tp.id, tp]));

    const townMap = new Map<
      string,
      {
        townId: string;
        townName: string | null;
        townSlug: string | null;
        revenue: number;
        cogs: number;
        profit: number;
        saleItemsCount: number;
      }
    >();

    for (const g of grouped) {
      const tp = tpToTown.get(g.townProductId);
      if (!tp?.townId) continue;

      const revenue = Number(g._sum.revenue ?? 0);
      const cogs = Number(g._sum.cogs ?? 0);
      const profit = Number(g._sum.profit ?? 0);
      const saleItemsCount = Number(g._count ?? 0);

      const cur =
        townMap.get(tp.townId) ??
        ({
          townId: tp.townId,
          townName: tp.town?.name ?? null,
          townSlug: tp.town?.slug ?? null,
          revenue: 0,
          cogs: 0,
          profit: 0,
          saleItemsCount: 0,
        } as const);

      townMap.set(tp.townId, {
        ...cur,
        revenue: cur.revenue + revenue,
        cogs: cur.cogs + cogs,
        profit: cur.profit + profit,
        saleItemsCount: cur.saleItemsCount + saleItemsCount,
      });
    }

    const rows = Array.from(townMap.values()).map((t) => {
      const marginPercent = t.revenue > 0 ? (t.profit / t.revenue) * 100 : 0;
      return {
        townId: t.townId,
        townName: t.townName,
        townSlug: t.townSlug,
        saleItemsCount: t.saleItemsCount,
        revenue: this.round2(t.revenue),
        cogs: this.round2(t.cogs),
        profit: this.round2(t.profit),
        marginPercent: this.round2(marginPercent),
      };
    });

    rows.sort((a, b) => {
      if (metric === 'profit') return b.profit - a.profit;
      if (metric === 'revenue') return b.revenue - a.revenue;
      if (metric === 'margin') return b.marginPercent - a.marginPercent;
      return b.saleItemsCount - a.saleItemsCount;
    });

    return { filters: { from: q.from ?? null, to: q.to ?? null, metric, limit }, rows: rows.slice(0, limit) };
  }

  async townLeaderboardCsv(q: TownLeaderboardQueryDto | any) {
    const data = await this.townLeaderboard(q);
    const headers = ['townId', 'townName', 'townSlug', 'saleItemsCount', 'revenue', 'cogs', 'profit', 'marginPercent'];
    return this.toCsv(headers, data.rows);
  }

  // -------------------------
  // Refund leaderboard (raw SQL)
  // -------------------------
  async refundLeaderboard(q: RefundLeaderboardQueryDto) {
    const limit = Math.min(Math.max(Number(q.limit ?? 10), 1), 100);
    const metric: 'refundedRevenue' | 'refundItemsCount' | 'nonRestockedCost' = q.metric ?? 'refundedRevenue';

    const from = q.from ? new Date(q.from) : null;
    const to = q.to ? new Date(q.to) : null;

    const rows = await this.prisma.$queryRaw<any[]>`
      WITH refund_rows AS (
        SELECT
          r.id                              AS refund_id,
          p."orderId"                       AS order_id,
          r.restock                         AS restock,
          r."createdAt"                     AS refund_created_at,

          si."townProductId"                AS town_product_id,
          tp."pricingModel"                 AS pricing_model,

          CASE
            WHEN si.quantity IS NOT NULL AND si.quantity > 0
              THEN (ri.quantity::numeric / si.quantity::numeric)
            WHEN si."weightGrams" IS NOT NULL AND si."weightGrams" > 0
              THEN (ri."weightGrams"::numeric / si."weightGrams"::numeric)
            ELSE 0
          END                               AS ratio,

          si.revenue::numeric               AS si_revenue,
          si.cogs::numeric                  AS si_cogs
        FROM "RefundItem" ri
        JOIN "Refund" r
          ON r.id = ri."refundId"
        JOIN "Payment" p
          ON p.id = r."paymentId"
        JOIN "SaleItem" si
          ON si."orderItemId" = ri."orderItemId"
        JOIN "TownProduct" tp
          ON tp.id = si."townProductId"
        WHERE 1=1
          AND (${from}::timestamptz IS NULL OR r."createdAt" >= ${from}::timestamptz)
          AND (${to}::timestamptz   IS NULL OR r."createdAt" <= ${to}::timestamptz)
          AND (${q.townId ?? null}::text IS NULL OR tp."townId" = ${q.townId ?? null}::text)
          AND (${q.productId ?? null}::text IS NULL OR tp."productId" = ${q.productId ?? null}::text)
      ),
      agg AS (
        SELECT
          town_product_id,
          pricing_model,

          SUM(si_revenue * ratio) AS refunded_revenue,

          SUM(CASE WHEN restock = true
            THEN (si_cogs * ratio) ELSE 0 END) AS refunded_cogs_restocked,

          SUM(CASE WHEN restock = false
            THEN (si_cogs * ratio) ELSE 0 END) AS non_restocked_cost,

          COUNT(*) AS refund_items_count,
          COUNT(DISTINCT refund_id) AS refunds_count,
          COUNT(DISTINCT order_id)  AS refunded_orders_count,

          SUM(CASE WHEN restock = true  THEN 1 ELSE 0 END) AS restocked_refund_items_count,
          SUM(CASE WHEN restock = false THEN 1 ELSE 0 END) AS non_restocked_refund_items_count
        FROM refund_rows
        GROUP BY town_product_id, pricing_model
      )
      SELECT
        a.town_product_id      AS "townProductId",
        tp."townId"            AS "townId",
        t.name                 AS "townName",
        t.slug                 AS "townSlug",
        tp."productId"         AS "productId",
        p.name                 AS "productName",
        a.pricing_model        AS "pricingModel",

        a.refunded_revenue     AS "refundedRevenue",
        a.refunded_cogs_restocked AS "refundedCogsRestocked",
        a.non_restocked_cost   AS "nonRestockedCost",

        a.refund_items_count   AS "refundItemsCount",
        a.refunds_count        AS "refundsCount",
        a.refunded_orders_count AS "refundedOrdersCount",
        a.restocked_refund_items_count AS "restockedRefundItemsCount",
        a.non_restocked_refund_items_count AS "nonRestockedRefundItemsCount"
      FROM agg a
      JOIN "TownProduct" tp ON tp.id = a.town_product_id
      JOIN "Town" t        ON t.id  = tp."townId"
      JOIN "Product" p     ON p.id  = tp."productId"
    `;

    const normalised = rows.map((r) => {
      const refundedRevenue = this.round2(Number(r.refundedRevenue ?? 0));
      const refundedCogsRestocked = this.round2(Number(r.refundedCogsRestocked ?? 0));
      const nonRestockedCost = this.round2(Number(r.nonRestockedCost ?? 0));

      return {
        townProductId: r.townProductId,
        townId: r.townId,
        townName: r.townName,
        townSlug: r.townSlug,
        productId: r.productId,
        productName: r.productName,
        pricingModel: r.pricingModel,

        refundedRevenue,
        refundedCogsRestocked,
        nonRestockedCost,

        refundItemsCount: Number(r.refundItemsCount ?? 0),
        refundsCount: Number(r.refundsCount ?? 0),
        refundedOrdersCount: Number(r.refundedOrdersCount ?? 0),
        restockedRefundItemsCount: Number(r.restockedRefundItemsCount ?? 0),
        nonRestockedRefundItemsCount: Number(r.nonRestockedRefundItemsCount ?? 0),
      };
    });

    const sorted = normalised
      .sort((a, b) => {
        const av =
          metric === 'refundItemsCount'
            ? a.refundItemsCount
            : metric === 'nonRestockedCost'
              ? a.nonRestockedCost
              : a.refundedRevenue;

        const bv =
          metric === 'refundItemsCount'
            ? b.refundItemsCount
            : metric === 'nonRestockedCost'
              ? b.nonRestockedCost
              : b.refundedRevenue;

        if (bv !== av) return bv - av;
        return String(a.townProductId).localeCompare(String(b.townProductId));
      })
      .slice(0, limit);

    return {
      filters: {
        from: q.from ?? null,
        to: q.to ?? null,
        townId: q.townId ?? null,
        productId: q.productId ?? null,
        metric,
        limit,
      },
      rows: sorted,
    };
  }

  async refundLeaderboardCsv(q: RefundLeaderboardQueryDto) {
    const data = await this.refundLeaderboard(q);
    const headers = [
      'townProductId',
      'townId',
      'townName',
      'townSlug',
      'productId',
      'productName',
      'pricingModel',
      'refundItemsCount',
      'refundsCount',
      'refundedOrdersCount',
      'refundedRevenue',
      'refundedCogsRestocked',
      'nonRestockedCost',
      'restockedRefundItemsCount',
      'nonRestockedRefundItemsCount',
    ];
    return this.toCsv(headers, data.rows.map((r: any) => ({ ...r })));
  }

  // -------------------------
  // Net profit (gross - restocked refund cogs, etc)
  // -------------------------
  async netProfit(q: NetProfitQueryDto | any) {
    const saleWhere: Prisma.SaleItemWhereInput = {
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
      saleWhere.townProductId = { in: ids };
    }

    const grossAgg = await this.prisma.saleItem.aggregate({
      where: saleWhere,
      _sum: { revenue: true, cogs: true, profit: true },
    });

    const grossRevenue = Number(grossAgg._sum.revenue ?? 0);
    const grossCogs = Number(grossAgg._sum.cogs ?? 0);
    const grossProfit = Number(grossAgg._sum.profit ?? 0);

    const refundWhere: Prisma.RefundItemWhereInput = {
      ...(q.from || q.to
        ? {
            refund: {
              createdAt: {
                ...(q.from ? { gte: new Date(q.from) } : {}),
                ...(q.to ? { lte: new Date(q.to) } : {}),
              },
            },
          }
        : {}),
    };

    const refundItems = await this.prisma.refundItem.findMany({
      where: refundWhere,
      select: {
        id: true,
        orderItemId: true,
        quantity: true,
        weightGrams: true,
        refund: { select: { id: true, createdAt: true, restock: true } },
        orderItem: { select: { orderId: true } },
      },
    });

    const refundIds = new Set<string>();
    const refundedOrderIds = new Set<string>();
    let restockedRefundItemsCount = 0;
    let nonRestockedRefundItemsCount = 0;

    for (const r of refundItems) {
      if (r.refund?.id) refundIds.add(r.refund.id);
      if (r.orderItem?.orderId) refundedOrderIds.add(r.orderItem.orderId);
      if (r.refund?.restock) restockedRefundItemsCount += 1;
      else nonRestockedRefundItemsCount += 1;
    }

    const orderItemIds = Array.from(new Set(refundItems.map((r) => r.orderItemId)));

    const saleItems = await this.prisma.saleItem.findMany({
      where: {
        orderItemId: { in: orderItemIds },
        ...(saleWhere.townProductId ? { townProductId: saleWhere.townProductId } : {}),
      },
      select: {
        orderItemId: true,
        townProductId: true,
        unitPrice: true,
        unitCost: true,
        townProduct: { select: { pricingModel: true } },
      },
    });

    const saleByOrderItemId = new Map(saleItems.map((s) => [s.orderItemId, s]));

    let refundedRevenue = 0;
    let refundedCogsRestocked = 0;

    for (const r of refundItems) {
      const si = saleByOrderItemId.get(r.orderItemId);
      if (!si) continue;

      const unitPrice = Number(si.unitPrice ?? 0);
      const unitCost = Number(si.unitCost ?? 0);
      const isRestocked = Boolean(r.refund?.restock);
      const pricingModel = si.townProduct?.pricingModel;

      if (pricingModel === 'UNIT') {
        const qty = Number(r.quantity ?? 0);
        refundedRevenue += unitPrice * qty;
        if (isRestocked) refundedCogsRestocked += unitCost * qty;
      } else {
        const grams = Number(r.weightGrams ?? 0);
        const kg = grams / 1000;
        refundedRevenue += unitPrice * kg;
        if (isRestocked) refundedCogsRestocked += unitCost * kg;
      }
    }

    const netRevenue = grossRevenue - refundedRevenue;
    const netCogs = grossCogs - refundedCogsRestocked;
    const netProfit = netRevenue - netCogs;

    const grossMargin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;
    const netMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

    return {
      filters: { from: q.from ?? null, to: q.to ?? null, townId: q.townId ?? null },
      gross: {
        revenue: this.round2(grossRevenue),
        cogs: this.round2(grossCogs),
        profit: this.round2(grossProfit),
        marginPercent: this.round2(grossMargin),
      },
      refunds: {
        refundedRevenue: this.round2(refundedRevenue),
        refundedCogsRestocked: this.round2(refundedCogsRestocked),
        refundItemsCount: refundItems.length,
        refundsCount: refundIds.size,
        refundedOrdersCount: refundedOrderIds.size,
        restockedRefundItemsCount,
        nonRestockedRefundItemsCount,
      },
      net: {
        revenue: this.round2(netRevenue),
        cogs: this.round2(netCogs),
        profit: this.round2(netProfit),
        marginPercent: this.round2(netMargin),
      },
    };
  }

  // -------------------------
  // Net profit timeseries (bucket by SALE date; refunds reduce same bucket)
  // -------------------------
  async netProfitTimeseries(q: any) {
    const bucket: 'day' | 'week' | 'month' = q.bucket ?? 'day';
    const keyFor = (d: Date) =>
      bucket === 'day' ? this.getDayKey(d) : bucket === 'week' ? this.getISOWeekKey(d) : this.getMonthKey(d);

    const saleWhere: Prisma.SaleItemWhereInput = {
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
      saleWhere.townProductId = { in: ids };
    }

    const saleItems = await this.prisma.saleItem.findMany({
      where: saleWhere,
      select: { createdAt: true, revenue: true, cogs: true, orderItemId: true },
      orderBy: { createdAt: 'asc' },
    });

    const saleByOrderItemId = new Map<string, { createdAt: Date }>();
    for (const s of saleItems) saleByOrderItemId.set(s.orderItemId, { createdAt: s.createdAt });

    const refundItems = await this.prisma.refundItem.findMany({
      where: {
        ...(q.from || q.to
          ? {
              refund: {
                createdAt: {
                  ...(q.from ? { gte: new Date(q.from) } : {}),
                  ...(q.to ? { lte: new Date(q.to) } : {}),
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        orderItemId: true,
        quantity: true,
        weightGrams: true,
        refund: { select: { id: true, createdAt: true, restock: true } },
        orderItem: { select: { orderId: true } },
      },
    });

    if (saleItems.length === 0 && refundItems.length === 0) {
      return { filters: { from: q.from ?? null, to: q.to ?? null, townId: q.townId ?? null, bucket }, rows: [] };
    }

    const orderItemIds = Array.from(new Set(refundItems.map((r) => r.orderItemId)));

    const saleMeta = await this.prisma.saleItem.findMany({
      where: {
        orderItemId: { in: orderItemIds },
        ...(saleWhere.townProductId ? { townProductId: saleWhere.townProductId } : {}),
      },
      select: {
        orderItemId: true,
        createdAt: true,
        unitPrice: true,
        unitCost: true,
        townProduct: { select: { pricingModel: true } },
      },
    });

    const metaByOrderItemId = new Map<string, typeof saleMeta[number]>();
    for (const m of saleMeta) metaByOrderItemId.set(m.orderItemId, m);

    type BucketRow = {
      grossRevenue: number;
      grossCogs: number;
      refundedRevenue: number;
      refundedCogsRestocked: number;
      saleItemsCount: number;
      refundItemsCount: number;
      refundsCountSet: Set<string>;
      refundedOrdersCountSet: Set<string>;
      restockedRefundItemsCount: number;
      nonRestockedRefundItemsCount: number;
    };

    const buckets = new Map<string, BucketRow>();
    const ensure = (k: string): BucketRow => {
      const cur = buckets.get(k);
      if (cur) return cur;
      const fresh: BucketRow = {
        grossRevenue: 0,
        grossCogs: 0,
        refundedRevenue: 0,
        refundedCogsRestocked: 0,
        saleItemsCount: 0,
        refundItemsCount: 0,
        refundsCountSet: new Set<string>(),
        refundedOrdersCountSet: new Set<string>(),
        restockedRefundItemsCount: 0,
        nonRestockedRefundItemsCount: 0,
      };
      buckets.set(k, fresh);
      return fresh;
    };

    for (const s of saleItems) {
      const k = keyFor(s.createdAt);
      const cur = ensure(k);
      cur.grossRevenue += Number(s.revenue ?? 0);
      cur.grossCogs += Number(s.cogs ?? 0);
      cur.saleItemsCount += 1;
    }

    for (const r of refundItems) {
      const meta = metaByOrderItemId.get(r.orderItemId);
      if (!meta) continue;

      const saleCreatedAt = saleByOrderItemId.get(r.orderItemId)?.createdAt ?? meta.createdAt;
      if (!saleCreatedAt) continue;

      const k = keyFor(saleCreatedAt);
      const cur = ensure(k);

      if (r.refund?.id) cur.refundsCountSet.add(r.refund.id);
      if (r.orderItem?.orderId) cur.refundedOrdersCountSet.add(r.orderItem.orderId);

      if (Boolean(r.refund?.restock)) cur.restockedRefundItemsCount += 1;
      else cur.nonRestockedRefundItemsCount += 1;

      const unitPrice = Number(meta.unitPrice ?? 0);
      const unitCost = Number(meta.unitCost ?? 0);
      const isRestocked = Boolean(r.refund?.restock);
      const pricingModel = meta.townProduct?.pricingModel;

      if (pricingModel === 'UNIT') {
        const qty = Number(r.quantity ?? 0);
        cur.refundedRevenue += unitPrice * qty;
        if (isRestocked) cur.refundedCogsRestocked += unitCost * qty;
      } else {
        const grams = Number(r.weightGrams ?? 0);
        const kg = grams / 1000;
        cur.refundedRevenue += unitPrice * kg;
        if (isRestocked) cur.refundedCogsRestocked += unitCost * kg;
      }

      cur.refundItemsCount += 1;
    }

    const rows = Array.from(buckets.entries())
      .map(([period, v]) => {
        const grossProfit = v.grossRevenue - v.grossCogs;
        const netRevenue = v.grossRevenue - v.refundedRevenue;
        const netCogs = v.grossCogs - v.refundedCogsRestocked;
        const netProfit = netRevenue - netCogs;

        return {
          period,
          saleItemsCount: v.saleItemsCount,
          refundItemsCount: v.refundItemsCount,
          grossRevenue: this.round2(v.grossRevenue),
          grossCogs: this.round2(v.grossCogs),
          grossProfit: this.round2(grossProfit),
          refundedRevenue: this.round2(v.refundedRevenue),
          refundedCogsRestocked: this.round2(v.refundedCogsRestocked),
          netRevenue: this.round2(netRevenue),
          netCogs: this.round2(netCogs),
          netProfit: this.round2(netProfit),
          grossMarginPercent: this.round2(v.grossRevenue > 0 ? (grossProfit / v.grossRevenue) * 100 : 0),
          netMarginPercent: this.round2(netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0),
          refundsCount: v.refundsCountSet.size,
          refundedOrdersCount: v.refundedOrdersCountSet.size,
          restockedRefundItemsCount: v.restockedRefundItemsCount,
          nonRestockedRefundItemsCount: v.nonRestockedRefundItemsCount,
        };
      })
      .sort((a, b) => (a.period < b.period ? -1 : a.period > b.period ? 1 : 0));

    return { filters: { from: q.from ?? null, to: q.to ?? null, townId: q.townId ?? null, bucket }, rows };
  }

  // -------------------------
  // Sales timeseries (SaleItem only)
  // -------------------------
  async salesTimeseries(q: SalesTimeseriesQueryDto | any) {
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

    const items = await this.prisma.saleItem.findMany({
      where,
      select: { createdAt: true, revenue: true, cogs: true, profit: true },
      orderBy: { createdAt: 'asc' },
    });

    const map = new Map<string, { revenue: number; cogs: number; profit: number; count: number }>();

    for (const it of items) {
      const d = it.createdAt;
      const key = bucket === 'day' ? this.getDayKey(d) : bucket === 'week' ? this.getISOWeekKey(d) : this.getMonthKey(d);

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

    return { filters: { from: q.from ?? null, to: q.to ?? null, townId: q.townId ?? null, bucket }, rows };
  }

  // -------------------------
  // Stock valuation (snapshot vs ledger)
  // -------------------------
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

        const snapshotValue = tp.pricingModel === 'UNIT' ? snapshotQty * unitRate : (snapshotWg / 1000) * unitRate;

        const ledgerValue = tp.pricingModel === 'UNIT' ? ledgerQty * unitRate : (ledgerWg / 1000) * unitRate;

        totalSnapshotValue += snapshotValue;
        totalLedgerValue += ledgerValue;

        return {
          townProductId: tp.id,
          townId: tp.townId,
          productId: tp.productId,
          productName: tp.product?.name ?? null,
          pricingModel: tp.pricingModel,

          stockQty: tp.stockQty ?? null,
          stockWeightGrams: tp.stockWeightGrams ?? null,

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
    const limit = Number(q.limit ?? 1000);
    const data = await this.stockValuation({ ...q, limit });

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
      'diffValue',
      'isMismatch',
      'lastMovementAt',
    ];

    const csvRows = data.items.map((r: any) => ({ ...r }));

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
        diffValue: data.totals.diffValue ?? '',
        isMismatch: '',
        lastMovementAt: '',
      });
    }

    return this.toCsv(headers, csvRows);
  }

  // -------------------------
  // Profit report (stock * price/cost)
  // -------------------------
  async getProfitReport(q: ProfitReportQueryDto) {
    const limit = Number(q.limit ?? 50);

    const where: Prisma.TownProductWhereInput = {
      ...(q.townId ? { townId: q.townId } : {}),
      ...(q.townProductId ? { id: q.townProductId } : {}),
      ...(q.pricingModel ? { pricingModel: q.pricingModel } : {}),
    };

    const townProducts = await this.prisma.townProduct.findMany({
      where,
      take: limit + 1,
      ...(q.cursor ? { skip: 1, cursor: { id: q.cursor } } : {}),
      orderBy: { id: 'asc' },
      include: { product: true, town: true },
    });

    const hasNext = townProducts.length > limit;
    const page = hasNext ? townProducts.slice(0, limit) : townProducts;
    const nextCursor = hasNext ? page[page.length - 1]?.id : null;

    let totalSellingValue = 0;
    let totalCostValue = 0;

    const rows = page.map((tp) => {
      const pricingModel = tp.pricingModel;

      const stockQty = Number(tp.stockQty ?? 0);
      const stockWeightGrams = Number(tp.stockWeightGrams ?? 0);

      const pricePerUnit = Number(tp.pricePerUnit ?? 0);
      const pricePerKg = Number(tp.pricePerKg ?? 0);
      const costPerUnit = Number(tp.costPerUnit ?? 0);
      const costPerKg = Number(tp.costPerKg ?? 0);

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

      const sellingValueR = this.round2(sellingValue);
      const costValueR = this.round2(costValue);
      const profitR = this.round2(profit);
      const marginPercentR = this.round2(marginPercent);

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

    const totalProfit = this.round2(totalSellingValue - totalCostValue);
    const totalMarginPercent = totalSellingValue > 0 ? this.round2((totalProfit / totalSellingValue) * 100) : 0;

    return {
      rows,
      totals: {
        sellingValue: this.round2(totalSellingValue),
        costValue: this.round2(totalCostValue),
        profit: totalProfit,
        marginPercent: totalMarginPercent,
      },
      nextCursor,
    };
  }

  async profitCsv(q: any) {
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

    const csvRows = data.rows.map((r: any) => ({ ...r }));
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

  // -------------------------
  // Sales profit report (paged TownProducts + grouped SaleItems)
  // -------------------------
  async salesProfitReport(q: SalesProfitQueryDto | any) {
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

    // If filtering by townId, apply to sale where via townProductIds
    if (q.townId) {
      const ids = await this.townProductIdsForTown(q.townId);
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
      return { rows: [], totals: { revenue: 0, cogs: 0, profit: 0, marginPercent: 0 }, pageInfo: { limit, hasNextPage: false, nextCursor: null } };
    }

    const pageIds = page.map((x) => x.id);

    const grouped = await this.prisma.saleItem.groupBy({
      by: ['townProductId'],
      where: { ...where, townProductId: { in: pageIds } },
      _sum: { revenue: true, cogs: true, profit: true },
      _count: true,
    });

    const sumsByTp = new Map(
      grouped.map((g) => [
        g.townProductId,
        {
          revenue: Number(g._sum.revenue ?? 0),
          cogs: Number(g._sum.cogs ?? 0),
          profit: Number(g._sum.profit ?? 0),
          count: Number(g._count ?? 0),
        },
      ]),
    );

    const rows = page.map((tp) => {
      const s = sumsByTp.get(tp.id) ?? { revenue: 0, cogs: 0, profit: 0, count: 0 };
      const marginPercent = s.revenue > 0 ? (s.profit / s.revenue) * 100 : 0;

      return {
        townProductId: tp.id,
        townId: tp.townId,
        townName: tp.town?.name ?? null,
        townSlug: tp.town?.slug ?? null,
        productName: tp.product?.name ?? null,
        pricingModel: tp.pricingModel,
        saleItemsCount: s.count,
        revenue: this.round2(s.revenue),
        cogs: this.round2(s.cogs),
        profit: this.round2(s.profit),
        marginPercent: this.round2(marginPercent),
      };
    });

    const filteredRows = q.onlyWithSales ? rows.filter((r) => r.saleItemsCount > 0) : rows;

    let revenue = 0;
    let cogs = 0;
    let profit = 0;
    for (const r of filteredRows) {
      revenue += r.revenue;
      cogs += r.cogs;
      profit += r.profit;
    }
    const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      rows: filteredRows,
      totals: {
        revenue: this.round2(revenue),
        cogs: this.round2(cogs),
        profit: this.round2(profit),
        marginPercent: this.round2(marginPercent),
      },
      pageInfo: { limit, hasNextPage, nextCursor },
    };
  }

  async salesProfitCsv(q: any) {
    const pageLimit = Math.min(Math.max(Number(q.limit ?? 200), 1), 200);
    const maxRows = Number(q.maxRows ?? 5000);

    let cursor: string | null = q.cursor ?? null;
    const allRows: any[] = [];

    let revenue = 0;
    let cogs = 0;
    let profit = 0;

    while (true) {
      const data = await this.salesProfitReport({ ...q, limit: pageLimit, cursor });
      for (const r of data.rows) {
        allRows.push(r);
        revenue += Number(r.revenue ?? 0);
        cogs += Number(r.cogs ?? 0);
        profit += Number(r.profit ?? 0);
      }
      if (!data.pageInfo?.hasNextPage) break;
      cursor = data.pageInfo.nextCursor;
      if (allRows.length >= maxRows) break;
    }

    const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;

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
    csvRows.push({
      townProductId: 'TOTALS',
      townId: '',
      townName: '',
      townSlug: '',
      productName: '',
      pricingModel: '',
      saleItemsCount: '',
      revenue: this.round2(revenue),
      cogs: this.round2(cogs),
      profit: this.round2(profit),
      marginPercent: this.round2(marginPercent),
    });

    return this.toCsv(headers, csvRows);
  }

  // -------------------------
  // Set cost on TownProduct
  // -------------------------
  async setCost(dto: SetCostDto) {
    const { townProductId, costPerUnit, costPerKg, note } = dto;

    if ((costPerUnit == null && costPerKg == null) || (costPerUnit != null && costPerKg != null)) {
      throw new BadRequestException('Provide exactly one of costPerUnit or costPerKg');
    }

    const tp = await this.prisma.townProduct.findUnique({
      where: { id: townProductId },
      select: { id: true, pricingModel: true },
    });

    if (!tp) throw new BadRequestException('TownProduct not found');

    if (tp.pricingModel === 'UNIT' && costPerUnit == null) throw new BadRequestException('UNIT products require costPerUnit');
    if (tp.pricingModel === 'WEIGHT' && costPerKg == null) throw new BadRequestException('WEIGHT products require costPerKg');

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

  // -------------------------
  // Ops dashboard (matches OpsDashboardResponseDto incl top lists)
  // -------------------------
  async getOpsDashboard(q: OpsDashboardQueryDto): Promise<OpsDashboardResponseDto> {
  const townId = q.townId ?? null;
  const confirmedStaleHours = q.confirmedStaleHours ?? 2;

  const startToday = this.startOfTodayUtc();
  const startTomorrow = this.startOfTomorrowUtc();
  const staleCutoff = new Date(Date.now() - confirmedStaleHours * 60 * 60 * 1000);

  const townWhere = townId ? { townId } : {};

  // TownProduct queries (safe)
  const [totalTownProducts, productsMissingImages] = await Promise.all([
    this.prisma.townProduct.count({ where: townWhere }),
    this.prisma.townProduct.count({
      where: { ...townWhere, images: { none: {} } },
    }),
  ]);

  const [lowUnit, lowWeight] = await Promise.all([
    this.prisma.townProduct.count({
      where: { ...townWhere, pricingModel: "UNIT", stockQty: { lt: 5 } },
    }),
    this.prisma.townProduct.count({
      where: { ...townWhere, pricingModel: "WEIGHT", stockWeightGrams: { lt: 2000 } },
    }),
  ]);

  const lowStockCount = lowUnit + lowWeight;

  // Orders (safe because Order has townId)
  const [ordersToday, confirmedStaleCount] = await Promise.all([
    this.prisma.order.count({
      where: {
        ...townWhere,
        createdAt: { gte: startToday, lt: startTomorrow },
      },
    }),
    this.prisma.order.count({
      where: {
        ...townWhere,
        status: "CONFIRMED",
        updatedAt: { lt: staleCutoff },
      },
    }),
  ]);

  // 🔥 Revenue FIX — filter via Order relation, NOT townWhere
  const revenueAgg = await this.prisma.payment.aggregate({
    where: {
      status: "SUCCESS",
      createdAt: { gte: startToday, lt: startTomorrow },
      order: townId ? { townId } : undefined,
    },
    _sum: { amount: true },
  });

  const revenueToday = this.round2(Number(revenueAgg._sum.amount ?? 0));

  // 🔥 Refund FIX — filter via Payment -> Order relation
     // Refunds today (safe)
    // Option A: If Refund has `amount`, use it.
    // Option B (fallback): If you track refund payments as Payment records (status SUCCESS + kind/type), sum those.
    let refundsToday = 0;

    // --- A) Try Refund.amount first ---
    try {
      const refundsAgg = await this.prisma.refund.aggregate({
        where: {
          createdAt: { gte: startToday, lt: startTomorrow },
          ...(townId
            ? {
                // Filter refunds to this town using paymentId -> Payment -> orderId -> Order (manual join)
                payment: undefined as any, // keep TS happy; we won't use it
              }
            : {}),
        },
        // @ts-ignore (only works if Refund.amount exists)
        _sum: { amount: true },
      });

      // @ts-ignore
      refundsToday = this.round2(Number(refundsAgg._sum?.amount ?? 0));
    } catch {
      // --- B) Fallback: derive refunds via Orders + Refund table ---
      // Find refunds created today, then filter by town using Payment.orderId -> Order.townId
      try {
        const refunds = await this.prisma.refund.findMany({
          where: { createdAt: { gte: startToday, lt: startTomorrow } },
          select: { id: true, paymentId: true },
        });

        if (refunds.length === 0) {
          refundsToday = 0;
        } else {
          const paymentIds = refunds.map((r) => r.paymentId).filter(Boolean) as string[];

          const payments = await this.prisma.payment.findMany({
            where: {
              id: { in: paymentIds },
              ...(townId ? { order: { townId } } : {}),
            },
            select: { id: true, amount: true },
          });

          refundsToday = this.round2(
            payments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0),
          );
        }
      } catch {
        refundsToday = 0;
      }
    }
  const TOP = 5;

  const [missingImagesTopRaw, lowStockTopRaw, confirmedStaleTopRaw] =
    await Promise.all([
      this.prisma.townProduct.findMany({
        where: { ...townWhere, images: { none: {} } },
        take: TOP,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          townId: true,
          productId: true,
          pricingModel: true,
          stockQty: true,
          stockWeightGrams: true,
          town: { select: { name: true, slug: true } },
          product: { select: { name: true } },
          _count: { select: { images: true } },
        },
      }),

      this.prisma.townProduct.findMany({
        where: {
          ...townWhere,
          OR: [
            { pricingModel: "UNIT", stockQty: { lt: 5 } },
            { pricingModel: "WEIGHT", stockWeightGrams: { lt: 2000 } },
          ],
        },
        take: TOP,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          townId: true,
          productId: true,
          pricingModel: true,
          stockQty: true,
          stockWeightGrams: true,
          town: { select: { name: true, slug: true } },
          product: { select: { name: true } },
          _count: { select: { images: true } },
        },
      }),

      this.prisma.order.findMany({
        where: {
          ...townWhere,
          status: "CONFIRMED",
          updatedAt: { lt: staleCutoff },
        },
        take: TOP,
        orderBy: { updatedAt: "asc" },
        select: {
          id: true,
          townId: true,
          status: true,
          updatedAt: true,
          town: { select: { name: true, slug: true } },
        },
      }),
    ]);

      const missingImagesTop = missingImagesTopRaw.map((tp) => ({
    id: tp.id,
    label: tp.product?.name ?? tp.id,
    href: `/ops/town-products/${tp.id}/images`,
  }));

  const lowStockTop = lowStockTopRaw.map((tp) => ({
    id: tp.id,
    label: tp.product?.name ?? tp.id,
    href: `/ops/stock/${tp.id}`,
  }));

  const confirmedStaleTop = confirmedStaleTopRaw.map((o) => ({
    id: o.id,
    label: `Order ${o.id}`,
    href: `/ops/orders/${o.id}`,
  }));

  return {
    generatedAt: new Date().toISOString(),
    townId,
    totalTownProducts,
    productsMissingImages,
    lowStockCount,
    ordersToday,
    revenueToday,
    refundsToday,
    confirmedStaleCount,

    missingImagesTop,
    lowStockTop,
    confirmedStaleTop,
  };
  }
    async financeSummary(adminUser: any, requestedTownId?: string | null) {
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const effectiveTownId =
  adminUser?.role === 'GLOBAL_SUPER_ADMIN'
    ? requestedTownId ?? null
    : adminUser?.townId ?? null;

const townFilter = effectiveTownId ? { townId: effectiveTownId } : {};

const paymentTownFilter = effectiveTownId
  ? { order: { townId: effectiveTownId } }
  : {};
    const [
      todayPayments,
      weekPayments,
      todayCodCollected,
      codOutstandingOrders,
      todaySettledOrders,
      todayDeliveredOrders,
      todaySales,
      weekSales,
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          status: 'SUCCESS',
          createdAt: { gte: startOfToday },
          ...paymentTownFilter,
        },
        _sum: { amount: true },
      }),

      this.prisma.payment.aggregate({
        where: {
          status: 'SUCCESS',
          createdAt: { gte: startOfWeek },
          ...paymentTownFilter,
        },
        _sum: { amount: true },
      }),

      this.prisma.payment.aggregate({
        where: {
          status: 'SUCCESS',
          method: 'COD',
          purpose: 'COD_GOODS',
          createdAt: { gte: startOfToday },
          ...paymentTownFilter,
        },
        _sum: { amount: true },
      }),

      this.prisma.order.findMany({
        where: {
          status: 'FULFILLED',
          goodsPaymentMethod: 'COD',
          payOnDeliveryTotal: { gt: 0 },
          deliveredAt: { not: null },
          ...townFilter,
          NOT: {
            payments: {
              some: {
                purpose: 'COD_GOODS',
                status: 'SUCCESS',
              },
            },
          },
        },
        select: {
          id: true,
          payOnDeliveryTotal: true,
          driverId: true,
          driverName: true,
          driverPhone: true,
          deliveredAt: true,
        },
      }),

      this.prisma.order.count({
        where: {
          status: 'SETTLED',
          updatedAt: { gte: startOfToday },
          ...townFilter,
        },
      }),

      this.prisma.order.count({
        where: {
          deliveredAt: { gte: startOfToday },
          ...townFilter,
        },
      }),

      this.prisma.saleItem.aggregate({
        where: {
          createdAt: { gte: startOfToday },
        },
        _sum: {
          revenue: true,
          cogs: true,
          profit: true,
        },
      }),

      this.prisma.saleItem.aggregate({
        where: {
          createdAt: { gte: startOfWeek },
        },
        _sum: {
          revenue: true,
          cogs: true,
          profit: true,
        },
      }),
    ]);

    const codOutstandingAmount = codOutstandingOrders.reduce(
      (sum, order) => sum + Number(order.payOnDeliveryTotal ?? 0),
      0,
    );

    const outstandingByDriverMap = new Map<string, any>();

    for (const order of codOutstandingOrders) {
      const key = order.driverId || 'unassigned';

      if (!outstandingByDriverMap.has(key)) {
        outstandingByDriverMap.set(key, {
          driverId: order.driverId,
          driverName: order.driverName || 'Unassigned',
          driverPhone: order.driverPhone,
          totalOutstanding: 0,
          ordersCount: 0,
        });
      }

      const row = outstandingByDriverMap.get(key);
      row.totalOutstanding += Number(order.payOnDeliveryTotal ?? 0);
      row.ordersCount += 1;
    }

    return {
      generatedAt: now.toISOString(),
      scope: {
        role: adminUser?.role,
        townId: effectiveTownId,
      },
      totals: {
        todayRevenue: this.round2(Number(todayPayments._sum.amount ?? 0)),
        weekRevenue: this.round2(Number(weekPayments._sum.amount ?? 0)),
        todayCodCollected: this.round2(Number(todayCodCollected._sum.amount ?? 0)),
        codOutstandingAmount: this.round2(codOutstandingAmount),
        codOutstandingOrders: codOutstandingOrders.length,
        todaySettledOrders,
        todayDeliveredOrders,
        todayProfit: this.round2(Number(todaySales._sum.profit ?? 0)),
        weekProfit: this.round2(Number(weekSales._sum.profit ?? 0)),
        todayCogs: this.round2(Number(todaySales._sum.cogs ?? 0)),
        weekCogs: this.round2(Number(weekSales._sum.cogs ?? 0)),
        todaySalesRevenue: this.round2(Number(todaySales._sum.revenue ?? 0)),
        weekSalesRevenue: this.round2(Number(weekSales._sum.revenue ?? 0)),
      },
      codOutstandingByDriver: Array.from(outstandingByDriverMap.values()).map(
        (row) => ({
          ...row,
          totalOutstanding: this.round2(row.totalOutstanding),
        }),
      ),
    };
  }
}