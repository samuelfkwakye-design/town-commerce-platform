import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class DriverService {
  constructor(private readonly prisma: PrismaService) {}

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
      where: {
        id: orderId,
        driverId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('Only CONFIRMED orders can be picked up');
    }

    return this.prisma.order.update({
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
  }

  async deliverOrder(driverId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        driverId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.FULFILLED) {
      throw new BadRequestException('Only FULFILLED orders can be delivered');
    }

    return this.prisma.order.update({
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
  }
}