import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminRole } from '../../common/auth/roles.decorator';

type ListCustomersParams = {
  search?: string;
  townId?: string;
};

type CurrentAdminUser = {
  sub: string;
  role: AdminRole;
  townId?: string | null;
};

@Injectable()
export class AdminCustomersService {
  constructor(private readonly prisma: PrismaService) {}

  private isGlobal(admin: CurrentAdminUser) {
    return admin.role === AdminRole.GLOBAL_SUPER_ADMIN;
  }

  private getEffectiveTownId(
    requestedTownId: string | undefined,
    admin: CurrentAdminUser,
  ) {
    if (this.isGlobal(admin)) {
      return requestedTownId?.trim() || undefined;
    }

    if (!admin.townId) {
      throw new ForbiddenException('Admin has no town assigned');
    }

    return admin.townId;
  }

  async listCustomers(
    params: ListCustomersParams,
    admin: CurrentAdminUser,
  ) {
    const search = params.search?.trim();
    const effectiveTownId = this.getEffectiveTownId(params.townId, admin);

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

        ...(effectiveTownId
          ? {
              orders: {
                some: {
                  townId: effectiveTownId,
                },
              },
            }
          : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        addresses: true,
        orders: {
          ...(effectiveTownId
            ? {
                where: {
                  townId: effectiveTownId,
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
          orderBy: {
            createdAt: 'desc',
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

      const relevantOrder = customer.orders[0];

      const townLabel =
        relevantOrder?.town?.name ||
        relevantOrder?.town?.slug ||
        defaultAddress?.town ||
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