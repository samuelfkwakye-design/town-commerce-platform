import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DriverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getAssignedOrders(driverId: string) {
    return this.prisma.order.findMany({
      where: {
        driverId,
        status: {
          in: [OrderStatus.CONFIRMED, OrderStatus.FULFILLED],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
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
        driverName: true,
        driverPhone: true,
        driverAssignedAt: true,
        town: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
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
        town: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('Only CONFIRMED orders can be picked up');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.FULFILLED,
      },
      select: {
        id: true,
        status: true,
        updatedAt: true,
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
    } catch {
      // Do not fail the driver action because SMS failed.
    }

    await this.prisma.adminNotification.create({
      data: {
        townId: order.town?.id,
        type: 'ORDER_PICKED_UP',
        title: 'Order picked up',
        message: `Order ${order.id} has been picked up by ${order.driverName || 'the driver'}.`,
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
        town: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.FULFILLED) {
      throw new BadRequestException('Only FULFILLED orders can be delivered');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.SETTLED,
      },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });

    try {
      await this.notificationsService.sendDriverDeliveredCustomerSms({
        phoneNumber: order.deliveryPhone || order.customerPhone,
        customerName: order.deliveryRecipientName,
        driverName: order.driverName,
        orderId: order.id,
      });
    } catch {
      // Do not fail the driver action because SMS failed.
    }

    await this.prisma.adminNotification.create({
      data: {
        townId: order.town?.id,
        type: 'ORDER_DELIVERED',
        title: 'Order delivered',
        message: `Order ${order.id} has been delivered by ${order.driverName || 'the driver'}.`,
        orderId: order.id,
        driverId,
      },
    });

    return updated;
  }
}