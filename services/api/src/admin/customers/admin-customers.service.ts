import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type ListCustomersParams = {
  search?: string;
  townId?: string;
};

@Injectable()
export class AdminCustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async listCustomers(params: ListCustomersParams) {
    const search = params.search?.trim();
    const townId = params.townId?.trim();

    const customers = await this.prisma.customer.findMany({
      where: {
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        addresses: true,
        orders: {
          ...(townId
            ? {
                where: {
                  townId,
                },
              }
            : {}),
          select: {
            id: true,
            townId: true,
            createdAt: true,
            town: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    const rows = customers.map((customer) => {
      const defaultAddress =
        customer.addresses.find((a) => a.isDefault) ?? customer.addresses[0];

      const fullName = [customer.firstName, customer.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();

      const relevantOrder = townId
        ? customer.orders.find((o) => o.townId === townId)
        : customer.orders[0];

      const townLabel =
        defaultAddress?.town ||
        relevantOrder?.town?.name ||
        relevantOrder?.town?.slug ||
        null;

      return {
        id: customer.id,
        name: fullName || null,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        email: customer.email,
        town: townLabel,
        addressCount: customer.addresses.length,
        orderCount: customer.orders.length,
        registeredAt: customer.createdAt,
      };
    });

    return {
      rows,
      count: rows.length,
    };
  }
}