import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DriverAvailability,
  OrderStatus,
  PaymentMethod,
  PaymentPurpose,
  PaymentStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DriverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private money(value: any): number {
    return Number(value ?? 0);
  }

  async getAssignedOrders(driverId: string) {
    return this.prisma.order.findMany({
      where: {
        driverId,
        OR: [
          { status: OrderStatus.CONFIRMED },
          { status: OrderStatus.FULFILLED, deliveredAt: null },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        deliveredAt: true,
        customerPhone: true,
        deliveryRecipientName: true,
        deliveryPhone: true,
        deliveryLine1: true,
        deliveryLine2: true,
        deliveryArea: true,
        deliveryTown: true,
        deliveryLandmark: true,
        deliveryNotes: true,
        total: true,
        payOnDeliveryTotal: true,
        goodsPaymentMethod: true,
        driverName: true,
        driverPhone: true,
        driverAssignedAt: true,
        town: { select: { id: true, name: true, slug: true } },
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            availability: true,
          },
        },
      },
    });
  }

  async updateAvailability(driverId: string, availability: DriverAvailability) {
    if (
      availability !== DriverAvailability.AVAILABLE &&
      availability !== DriverAvailability.OFFLINE
    ) {
      throw new BadRequestException(
        'Drivers can only set availability to AVAILABLE or OFFLINE',
      );
    }

    return this.prisma.driver.update({
      where: { id: driverId },
      data: { availability },
      select: {
        id: true,
        name: true,
        phone: true,
        availability: true,
        updatedAt: true,
      },
    });
  }

  async getDeliveryHistory(driverId: string) {
    return this.prisma.order.findMany({
      where: {
        driverId,
        deliveredAt: { not: null },
      },
      orderBy: { deliveredAt: 'desc' },
      take: 30,
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        deliveredAt: true,
        total: true,
        payOnDeliveryTotal: true,
        goodsPaymentMethod: true,
        deliveryRecipientName: true,
        deliveryPhone: true,
        deliveryArea: true,
        deliveryTown: true,
        payments: {
          where: { purpose: PaymentPurpose.COD_GOODS },
          select: {
            id: true,
            status: true,
            amount: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async getEarningsSummary(driverId: string) {
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const earningPerDelivery = 10;

    const [todayDeliveries, weekDeliveries, recentDeliveries] =
      await Promise.all([
        this.prisma.order.count({
          where: {
            driverId,
            deliveredAt: { gte: startOfToday },
          },
        }),
        this.prisma.order.count({
          where: {
            driverId,
            deliveredAt: { gte: startOfWeek },
          },
        }),
        this.prisma.order.findMany({
          where: {
            driverId,
            deliveredAt: { not: null },
          },
          orderBy: { deliveredAt: 'desc' },
          take: 10,
          select: {
            id: true,
            deliveredAt: true,
            total: true,
            goodsPaymentMethod: true,
            payOnDeliveryTotal: true,
          },
        }),
      ]);

    return {
      currency: 'GHS',
      earningPerDelivery,
      todayDeliveries,
      weekDeliveries,
      todayEstimatedEarnings: todayDeliveries * earningPerDelivery,
      weekEstimatedEarnings: weekDeliveries * earningPerDelivery,
      recentDeliveries: recentDeliveries.map((order) => ({
        orderId: order.id,
        deliveredAt: order.deliveredAt,
        orderTotal: this.money(order.total),
        goodsPaymentMethod: order.goodsPaymentMethod,
        codAmount: this.money(order.payOnDeliveryTotal),
        estimatedEarning: earningPerDelivery,
      })),
    };
  }

  async getCodSummary(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        name: true,
        phone: true,
        availability: true,
      },
    });

    if (!driver) throw new NotFoundException('Driver not found');

    const deliveredCodOrders = await this.prisma.order.findMany({
      where: {
        driverId,
        deliveredAt: { not: null },
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
      },
      orderBy: { deliveredAt: 'desc' },
      select: {
        id: true,
        deliveredAt: true,
        updatedAt: true,
        payOnDeliveryTotal: true,
        total: true,
        deliveryRecipientName: true,
        customerPhone: true,
        deliveryPhone: true,
        deliveryArea: true,
        deliveryTown: true,
      },
    });

    const outstandingAmount = deliveredCodOrders.reduce(
      (sum, order) => sum + this.money(order.payOnDeliveryTotal),
      0,
    );

    return {
      driver,
      outstandingAmount,
      deliveredCodOrders: deliveredCodOrders.map((order) => ({
        orderId: order.id,
        deliveredAt: order.deliveredAt || order.updatedAt,
        amountDue: this.money(order.payOnDeliveryTotal),
        orderTotal: this.money(order.total),
        customerName: order.deliveryRecipientName,
        customerPhone: order.deliveryPhone || order.customerPhone,
        area: order.deliveryArea,
        town: order.deliveryTown,
        status: 'PENDING_HANDOVER',
      })),
    };
  }

  async pickupOrder(driverId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, driverId },
      select: {
        id: true,
        status: true,
        customerPhone: true,
        deliveryRecipientName: true,
        deliveryPhone: true,
        driverName: true,
        driverPhone: true,
        town: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('Only CONFIRMED orders can be picked up');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.FULFILLED,
        deliveredAt: null,
      },
      select: {
        id: true,
        status: true,
        updatedAt: true,
        deliveredAt: true,
      },
    });

    try {
      await this.notificationsService.sendDriverPickedUpCustomerSms({
        phoneNumber: order.deliveryPhone || order.customerPhone,
        customerName: order.deliveryRecipientName,
        driverName: order.driverName,
        driverPhone: order.driverPhone,
        orderId: order.id,
      });
    } catch {}

    await this.prisma.adminNotification.create({
      data: {
        townId: order.town?.id,
        type: 'ORDER_PICKED_UP',
        title: 'Order picked up',
        message: `Order ${order.id} has been picked up by ${
          order.driverName || 'the driver'
        }.`,
        orderId: order.id,
        driverId,
      },
    });

    return updated;
  }

  async deliverOrder(driverId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, driverId },
      select: {
        id: true,
        status: true,
        customerPhone: true,
        deliveryRecipientName: true,
        deliveryPhone: true,
        driverName: true,
        goodsPaymentMethod: true,
        payOnDeliveryTotal: true,
        town: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    if (order.status !== OrderStatus.FULFILLED) {
      throw new BadRequestException('Only FULFILLED orders can be delivered');
    }

    const isCodWithCashDue =
      order.goodsPaymentMethod === PaymentMethod.COD &&
      this.money(order.payOnDeliveryTotal) > 0;

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        deliveredAt: new Date(),
        status: isCodWithCashDue ? OrderStatus.FULFILLED : OrderStatus.SETTLED,
      },
      select: {
        id: true,
        status: true,
        updatedAt: true,
        deliveredAt: true,
        goodsPaymentMethod: true,
        payOnDeliveryTotal: true,
      },
    });

    try {
      await this.notificationsService.sendDriverDeliveredCustomerSms({
        phoneNumber: order.deliveryPhone || order.customerPhone,
        customerName: order.deliveryRecipientName,
        driverName: order.driverName,
        orderId: order.id,
      });
    } catch {}

    await this.prisma.adminNotification.create({
      data: {
        townId: order.town?.id,
        type: 'ORDER_DELIVERED',
        title: isCodWithCashDue ? 'COD order delivered' : 'Order delivered',
        message: isCodWithCashDue
          ? `Order ${order.id} has been delivered by ${
              order.driverName || 'the driver'
            }. COD cash of GHS ${this.money(
              order.payOnDeliveryTotal,
            ).toFixed(2)} is pending handover.`
          : `Order ${order.id} has been delivered by ${
              order.driverName || 'the driver'
            }.`,
        orderId: order.id,
        driverId,
      },
    });

    return {
      ...updated,
      codPendingHandover: isCodWithCashDue,
      codAmountDue: this.money(order.payOnDeliveryTotal),
    };
  }
}