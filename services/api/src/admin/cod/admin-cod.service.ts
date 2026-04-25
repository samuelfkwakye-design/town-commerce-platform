import { Injectable } from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  PaymentPurpose,
  PaymentStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminCodService {
  constructor(private readonly prisma: PrismaService) {}

  private money(v: any) {
    return Number(v ?? 0);
  }

  async getOutstandingByDriver(adminUser: any) {
    const where: any = {
      status: OrderStatus.FULFILLED,
      goodsPaymentMethod: PaymentMethod.COD,
      payOnDeliveryTotal: { gt: 0 },
      NOT: {
        payments: {
          some: {
            purpose: PaymentPurpose.COD_GOODS,
            status: PaymentStatus.SUCCESS,
          },
        },
      },
    };

    // Town scoping
    if (adminUser.role !== 'GLOBAL_SUPER_ADMIN') {
      where.townId = adminUser.townId;
    }

    const orders = await this.prisma.order.findMany({
      where,
      select: {
        id: true,
        driverId: true,
        driverName: true,
        driverPhone: true,
        payOnDeliveryTotal: true,
        updatedAt: true,
      },
    });

    const grouped: Record<string, any> = {};

    for (const o of orders) {
      if (!o.driverId) continue;

      if (!grouped[o.driverId]) {
        grouped[o.driverId] = {
          driverId: o.driverId,
          driverName: o.driverName,
          driverPhone: o.driverPhone,
          totalOutstanding: 0,
          orders: [],
        };
      }

      grouped[o.driverId].totalOutstanding += this.money(
        o.payOnDeliveryTotal,
      );

      grouped[o.driverId].orders.push({
        orderId: o.id,
        amount: this.money(o.payOnDeliveryTotal),
        deliveredAt: o.updatedAt,
      });
    }

    return Object.values(grouped);
  }
}
