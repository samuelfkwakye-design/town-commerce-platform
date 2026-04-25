import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminDriverPayoutsService {
  constructor(private readonly prisma: PrismaService) {}

  private earningPerDelivery = 10;

  private startOfWeek() {
    const now = new Date();
    const start = new Date(now);
    const day = start.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diffToMonday);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private money(v: any) {
    return Number(v ?? 0);
  }

  private getTownScope(adminUser: any) {
    if (adminUser?.role === 'GLOBAL_SUPER_ADMIN') return {};
    if (!adminUser?.townId) {
      throw new ForbiddenException('Town-scoped admin has no town assigned');
    }
    return { townId: adminUser.townId };
  }

  async summary(adminUser: any) {
    const periodFrom = this.startOfWeek();
    const periodTo = new Date();

    const drivers = await this.prisma.driver.findMany({
      where: {
        isActive: true,
        ...this.getTownScope(adminUser),
      },
      orderBy: [{ townId: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        phone: true,
        townId: true,
        town: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    const rows = await Promise.all(
      drivers.map(async (driver) => {
        const [deliveries, paid] = await Promise.all([
          this.prisma.order.count({
            where: {
              driverId: driver.id,
              deliveredAt: {
                gte: periodFrom,
                lte: periodTo,
              },
            },
          }),

          this.prisma.driverPayout.aggregate({
            where: {
              driverId: driver.id,
              paidAt: {
                gte: periodFrom,
                lte: periodTo,
              },
              status: 'PAID',
            },
            _sum: {
              amount: true,
            },
          }),
        ]);

        const estimatedEarnings = deliveries * this.earningPerDelivery;
        const paidAmount = this.money(paid._sum.amount);
        const outstandingAmount = Math.max(estimatedEarnings - paidAmount, 0);

        return {
          driverId: driver.id,
          driverName: driver.name,
          driverPhone: driver.phone,
          townId: driver.townId,
          town: driver.town,
          deliveries,
          earningPerDelivery: this.earningPerDelivery,
          estimatedEarnings,
          paidAmount,
          outstandingAmount,
        };
      }),
    );

    return {
      periodFrom,
      periodTo,
      currency: 'GHS',
      rows,
      totals: {
        deliveries: rows.reduce((sum, row) => sum + row.deliveries, 0),
        estimatedEarnings: rows.reduce(
          (sum, row) => sum + row.estimatedEarnings,
          0,
        ),
        paidAmount: rows.reduce((sum, row) => sum + row.paidAmount, 0),
        outstandingAmount: rows.reduce(
          (sum, row) => sum + row.outstandingAmount,
          0,
        ),
      },
    };
  }

  async markPaid(
    adminUser: any,
    body: {
      driverId?: string;
      amount?: number;
      note?: string;
    },
  ) {
    const driverId = String(body.driverId ?? '').trim();
    const amount = Number(body.amount ?? 0);

    if (!driverId) {
      throw new BadRequestException('driverId is required');
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('amount must be greater than 0');
    }

    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        townId: true,
        name: true,
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (
      adminUser?.role !== 'GLOBAL_SUPER_ADMIN' &&
      adminUser?.townId !== driver.townId
    ) {
      throw new ForbiddenException('You cannot pay a driver from another town');
    }

    const payout = await this.prisma.driverPayout.create({
      data: {
        driverId: driver.id,
        townId: driver.townId,
        amount,
        status: 'PAID',
        paidById: adminUser?.sub ?? null,
        note: body.note?.trim() || null,
      },
    });

    return {
      message: `Payout recorded for ${driver.name}`,
      payout,
    };
  }
}
