import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  PaymentPurpose,
  PaymentStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminAlertsService {
  constructor(private readonly prisma: PrismaService) {}

  private earningPerDelivery = 10;

  private getTownScope(adminUser: any) {
    if (adminUser?.role === 'GLOBAL_SUPER_ADMIN') return {};

    if (!adminUser?.townId) {
      throw new ForbiddenException('Town-scoped admin has no town assigned');
    }

    return { townId: adminUser.townId };
  }

  private money(v: any) {
    return Number(v ?? 0);
  }

  async list(adminUser: any) {
    const townScope = this.getTownScope(adminUser);

    const now = new Date();
    const confirmedStaleCutoff = new Date(now.getTime() - 60 * 60 * 1000);

    const [codOutstandingOrders, staleConfirmedOrders, drivers] =
      await Promise.all([
        this.prisma.order.findMany({
          where: {
            ...townScope,
            status: OrderStatus.FULFILLED,
            goodsPaymentMethod: PaymentMethod.COD,
            payOnDeliveryTotal: { gt: 0 },
            deliveredAt: { not: null },
            NOT: {
              payments: {
                some: {
                  purpose: PaymentPurpose.COD_GOODS,
                  status: PaymentStatus.SUCCESS,
                },
              },
            },
          },
          select: {
            id: true,
            payOnDeliveryTotal: true,
            driverName: true,
            driverPhone: true,
            deliveredAt: true,
            town: { select: { name: true } },
          },
        }),

        this.prisma.order.findMany({
          where: {
            ...townScope,
            status: OrderStatus.CONFIRMED,
            updatedAt: { lt: confirmedStaleCutoff },
          },
          select: {
            id: true,
            updatedAt: true,
            town: { select: { name: true } },
          },
          take: 20,
          orderBy: { updatedAt: 'asc' },
        }),

        this.prisma.driver.findMany({
          where: {
            ...townScope,
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            phone: true,
            townId: true,
            town: { select: { name: true } },
            orders: {
              where: {
                deliveredAt: { not: null },
              },
              select: {
                id: true,
                deliveredAt: true,
              },
            },
          },
        }),
      ]);

    const alerts: any[] = [];

    const codOutstandingAmount = codOutstandingOrders.reduce(
      (sum, order) => sum + this.money(order.payOnDeliveryTotal),
      0,
    );

    if (codOutstandingAmount >= 500 || codOutstandingOrders.length > 0) {
      alerts.push({
        id: 'cod-outstanding',
        type: 'COD_OUTSTANDING',
        severity: codOutstandingAmount >= 1000 ? 'HIGH' : 'MEDIUM',
        title: 'COD cash needs collection',
        message: `${codOutstandingOrders.length} delivered COD order(s) have GHS ${codOutstandingAmount.toFixed(
          2,
        )} outstanding.`,
        amount: codOutstandingAmount,
        count: codOutstandingOrders.length,
        href: '/ops/cod',
      });
    }

    if (staleConfirmedOrders.length > 0) {
      alerts.push({
        id: 'stale-confirmed-orders',
        type: 'STALE_CONFIRMED_ORDERS',
        severity: staleConfirmedOrders.length >= 5 ? 'HIGH' : 'MEDIUM',
        title: 'Orders stuck in confirmed',
        message: `${staleConfirmedOrders.length} confirmed order(s) have not moved for over 1 hour.`,
        count: staleConfirmedOrders.length,
        href: '/ops/orders?status=CONFIRMED',
      });
    }

    const driverPayoutRows = await Promise.all(
      drivers.map(async (driver) => {
        const estimated = driver.orders.length * this.earningPerDelivery;

        const paid = await this.prisma.driverPayout.aggregate({
          where: {
            driverId: driver.id,
            status: 'PAID',
          },
          _sum: { amount: true },
        });

        const paidAmount = this.money(paid._sum.amount);
        const outstanding = Math.max(estimated - paidAmount, 0);

        return {
          driver,
          estimated,
          paidAmount,
          outstanding,
        };
      }),
    );

    const payoutOutstanding = driverPayoutRows.reduce(
      (sum, row) => sum + row.outstanding,
      0,
    );

    const driversOwed = driverPayoutRows.filter((row) => row.outstanding > 0);

    if (payoutOutstanding > 0) {
      alerts.push({
        id: 'driver-payouts-outstanding',
        type: 'DRIVER_PAYOUTS_OUTSTANDING',
        severity: payoutOutstanding >= 500 ? 'HIGH' : 'LOW',
        title: 'Driver payouts outstanding',
        message: `${driversOwed.length} driver(s) have GHS ${payoutOutstanding.toFixed(
          2,
        )} unpaid earnings.`,
        amount: payoutOutstanding,
        count: driversOwed.length,
        href: '/ops/driver-payouts',
      });
    }

    return {
      generatedAt: now.toISOString(),
      alerts,
      totals: {
        alerts: alerts.length,
        high: alerts.filter((a) => a.severity === 'HIGH').length,
        medium: alerts.filter((a) => a.severity === 'MEDIUM').length,
        low: alerts.filter((a) => a.severity === 'LOW').length,
      },
    };
  }
}