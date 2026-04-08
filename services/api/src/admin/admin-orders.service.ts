import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type ListQuery = {
  status?: string;
  townId?: string;
  q?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
};

@Injectable()
export class AdminOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: ListQuery) {
    const limit = Math.min(Math.max(Number(q.limit ?? 20), 1), 100);

    const where: any = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.townId ? { townId: q.townId } : {}),
      ...(q.from || q.to
        ? {
            createdAt: {
              ...(q.from ? { gte: new Date(q.from) } : {}),
              ...(q.to ? { lte: new Date(q.to) } : {}),
            },
          }
        : {}),
      ...(q.q
        ? {
            OR: [
              { id: { contains: q.q, mode: 'insensitive' } },
              { customerPhone: { contains: q.q, mode: 'insensitive' } },
              { customerEmail: { contains: q.q, mode: 'insensitive' } },
              { deliveryRecipientName: { contains: q.q, mode: 'insensitive' } },
              { driverName: { contains: q.q, mode: 'insensitive' } },
              { driverPhone: { contains: q.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.order.findMany({
      where,
      take: limit + 1,
      ...(q.cursor ? { skip: 1, cursor: { id: q.cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        townId: true,
        customerId: true,
        customerPhone: true,
        customerEmail: true,

        deliveryRecipientName: true,
        deliveryPhone: true,
        deliveryTown: true,

        driverId: true,
        driverName: true,
        driverPhone: true,
        driverAssignedAt: true,

        subtotal: true,
        total: true,
        payNowTotal: true,
        payOnDeliveryTotal: true,

        goodsPaymentMethod: true,

        town: {
          select: { id: true, name: true, slug: true },
        },

        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },

        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            method: true,
            purpose: true,
            amount: true,
            currency: true,
          },
        },
      },
    });

    const hasNextPage = rows.length > limit;
    const items = hasNextPage ? rows.slice(0, limit) : rows;
    const nextCursor = hasNextPage ? items[items.length - 1]?.id ?? null : null;

    return {
      filters: {
        status: q.status ?? null,
        townId: q.townId ?? null,
        q: q.q ?? null,
        from: q.from ?? null,
        to: q.to ?? null,
      },
      items,
      pageInfo: { limit, hasNextPage, nextCursor },
    };
  }

  async get(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        town: { select: { id: true, name: true, slug: true } },
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            availability: true,
            isActive: true,
            priority: true,
            lastAssignedAt: true,
          },
        },
        items: {
          include: {
            townProduct: {
              include: {
                product: { select: { id: true, name: true } },
                town: { select: { id: true, name: true, slug: true } },
              },
            },
            variant: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          include: { Refund: { include: { items: true } } },
        },
        sale: { include: { items: true } },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order not found: ${id}`);
    }

    return order;
  }

  async assignDriverById(orderId: string, driverId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        townId: true,
        status: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order not found: ${orderId}`);
    }

    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        townId: true,
        name: true,
        phone: true,
        isActive: true,
        availability: true,
      },
    });

    if (!driver) {
      throw new NotFoundException(`Driver not found: ${driverId}`);
    }

    if (!driver.isActive) {
      throw new BadRequestException('Selected driver is inactive');
    }

    if (driver.townId !== order.townId) {
      throw new BadRequestException(
        'Driver cannot be assigned to an order from a different town',
      );
    }

    const now = new Date();

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        driverId: driver.id,
        driverName: driver.name,
        driverPhone: driver.phone,
        driverAssignedAt: now,
      },
      include: {
        town: { select: { id: true, name: true, slug: true } },
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            availability: true,
            isActive: true,
            priority: true,
            lastAssignedAt: true,
          },
        },
      },
    });

    await this.prisma.driver.update({
      where: { id: driver.id },
      data: {
        lastAssignedAt: now,
      },
    });

    return updatedOrder;
  }

  async autoAssignDriver(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        townId: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order not found: ${orderId}`);
    }

    const activeOrderStatuses = ['CONFIRMED', 'FULFILLED'];

    const drivers = await this.prisma.driver.findMany({
      where: {
        townId: order.townId,
        isActive: true,
        availability: 'AVAILABLE',
      },
      include: {
        orders: {
          where: {
            status: {
              in: activeOrderStatuses as any,
            },
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!drivers.length) {
      throw new BadRequestException('No available drivers found for this town');
    }

    const sortedDrivers = [...drivers].sort((a, b) => {
      const activeCountA = a.orders.length;
      const activeCountB = b.orders.length;

      if (activeCountA !== activeCountB) {
        return activeCountA - activeCountB;
      }

      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }

      const timeA = a.lastAssignedAt ? new Date(a.lastAssignedAt).getTime() : 0;
      const timeB = b.lastAssignedAt ? new Date(b.lastAssignedAt).getTime() : 0;

      return timeA - timeB;
    });

    const selectedDriver = sortedDrivers[0];

    return this.assignDriverById(orderId, selectedDriver.id);
  }

  async assignDriverManual(
    orderId: string,
    driverName: string,
    driverPhone: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });

    if (!order) {
      throw new NotFoundException(`Order not found: ${orderId}`);
    }

    const cleanedName = driverName?.trim();
    const cleanedPhone = driverPhone?.trim();

    if (!cleanedName || !cleanedPhone) {
      throw new BadRequestException('driverName and driverPhone are required');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        driverId: null,
        driverName: cleanedName,
        driverPhone: cleanedPhone,
        driverAssignedAt: new Date(),
      },
    });
  }

  async clearDriver(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });

    if (!order) {
      throw new NotFoundException(`Order not found: ${orderId}`);
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        driverId: null,
        driverName: null,
        driverPhone: null,
        driverAssignedAt: null,
      },
    });
  }

  async markCodCollected(orderId: string, note?: string | null) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        // keep your existing COD collected logic here if you already had more
        // behaviour wired elsewhere
      },
    });
  }
}