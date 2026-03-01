import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from '../reports/reports.service';

function csvEscape(v: any): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeRow(res: any, cols: any[]) {
  res.write(cols.map(csvEscape).join(',') + '\n');
}

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

@Injectable()
export class AdminExportsService {
  constructor(
  private readonly prisma: PrismaService,
  private readonly reports: ReportsService,
) {}

  async streamOrdersCsv(q: any, res: any) {
    const from = parseDate(q.from);
    const to = parseDate(q.to);
    const townId = q.townId || undefined;
    const status = q.status || undefined;
    const search = q.q || undefined;

    writeRow(res, [
      'orderId',
      'createdAt',
      'updatedAt',
      'townId',
      'townName',
      'status',
      'customerPhone',
      'customerEmail',
      'subtotal',
      'total',
      'goodsPaymentMethod',
      'latestPaymentProvider',
      'latestPaymentMethod',
      'latestPaymentStatus',
      'latestPaymentAmount',
      'latestPaymentCurrency',
    ]);

    const orders = await this.prisma.order.findMany({
      where: {
        ...(townId ? { townId } : {}),
        ...(status ? { status } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
        ...(search
          ? {
              OR: [
                { id: { contains: search, mode: 'insensitive' } },
                { customerPhone: { contains: search } },
                { customerEmail: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        town: { select: { name: true } },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            provider: true,
            method: true,
            status: true,
            amount: true,
            currency: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    for (const o of orders as any[]) {
      const p = o.payments?.[0] ?? null;

      writeRow(res, [
        o.id,
        o.createdAt?.toISOString?.() ?? '',
        o.updatedAt?.toISOString?.() ?? '',
        o.townId ?? '',
        o.town?.name ?? '',
        o.status ?? '',
        o.customerPhone ?? '',
        o.customerEmail ?? '',
        o.subtotal ?? '',
        o.total ?? '',
        o.goodsPaymentMethod ?? '',
        p?.provider ?? '',
        p?.method ?? '',
        p?.status ?? '',
        p?.amount ?? '',
        p?.currency ?? '',
      ]);
    }

    res.end();
  }

  async streamRefundsCsv(q: any, res: any) {
    const from = parseDate(q.from);
    const to = parseDate(q.to);
    const townId = q.townId || undefined;
    const orderId = q.orderId || undefined;

    writeRow(res, [
      'refundId',
      'refundedAt',
      'orderId',
      'townId',
      'townName',
      'reason',
      'restock',
      'paymentProvider',
      'paymentMethod',
      'paymentStatus',
      'refundItemsCount',
    ]);

    const refunds = await this.prisma.refund.findMany({
      where: {
        ...(orderId ? { orderId } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: {
        Payment: { select: { provider: true, method: true, status: true } },
        items: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const orderIds = Array.from(new Set(refunds.map((r: any) => r.orderId).filter(Boolean)));

    const orders = orderIds.length
      ? await this.prisma.order.findMany({
          where: {
            id: { in: orderIds },
            ...(townId ? { townId } : {}),
          },
          include: { town: { select: { id: true, name: true } } },
        })
      : [];

    const orderById = new Map<string, any>();
    for (const o of orders as any[]) orderById.set(o.id, o);

    for (const r of refunds as any[]) {
      const o = r.orderId ? orderById.get(r.orderId) : null;
      if (townId && !o) continue;

      writeRow(res, [
        r.id,
        r.createdAt?.toISOString?.() ?? '',
        r.orderId ?? '',
        o?.townId ?? '',
        o?.town?.name ?? '',
        r.reason ?? '',
        r.restock ? 'true' : 'false',
        r.Payment?.provider ?? '',
        r.Payment?.method ?? '',
        r.Payment?.status ?? '',
        r.items?.length ?? 0,
      ]);
    }

    res.end();
  }

  /**
   * Phase 3: Net Profit Timeseries CSV
   * Endpoint: GET /api/v1/admin/exports/net-profit-timeseries.csv?bucket=day|week|month&townId=&from=&to=
   */
  async streamNetProfitTimeseriesCsv(q: any, res: any) {
    const bucketRaw = String(q.bucket || 'day');
    const bucket = (['day', 'week', 'month'].includes(bucketRaw) ? bucketRaw : 'day') as
      | 'day'
      | 'week'
      | 'month';

    const townId = q.townId || null;
    const from = q.from || null; // YYYY-MM-DD
    const to = q.to || null; // YYYY-MM-DD

    writeRow(res, [
      'period',
      'saleItemsCount',
      'refundItemsCount',
      'grossRevenue',
      'grossCogs',
      'grossProfit',
      'refundedRevenue',
      'refundedCogsRestocked',
      'netRevenue',
      'netCogs',
      'netProfit',
      'grossMarginPercent',
      'netMarginPercent',
      'refundsCount',
      'refundedOrdersCount',
      'restockedRefundItemsCount',
      'nonRestockedRefundItemsCount',
    ]);

    // Call whichever method exists in your ReportsService (keeps this resilient)
    const data =
      typeof (this.reports as any).getNetProfitTimeseries === 'function'
        ? await (this.reports as any).getNetProfitTimeseries({ bucket, townId, from, to })
        : await (this.reports as any).netProfitTimeseries({ bucket, townId, from, to });

    const rows: any[] = data?.rows ?? [];

    for (const r of rows) {
      writeRow(res, [
        r.period ?? '',
        r.saleItemsCount ?? 0,
        r.refundItemsCount ?? 0,
        r.grossRevenue ?? 0,
        r.grossCogs ?? 0,
        r.grossProfit ?? 0,
        r.refundedRevenue ?? 0,
        r.refundedCogsRestocked ?? 0,
        r.netRevenue ?? 0,
        r.netCogs ?? 0,
        r.netProfit ?? 0,
        r.grossMarginPercent ?? '',
        r.netMarginPercent ?? '',
        r.refundsCount ?? 0,
        r.refundedOrdersCount ?? 0,
        r.restockedRefundItemsCount ?? 0,
        r.nonRestockedRefundItemsCount ?? 0,
      ]);
    }

    res.end();
  }
}
