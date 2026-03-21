import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerAddressDto } from './dto/create-customer-address.dto';
import { UpdateCustomerAddressDto } from './dto/update-customer-address.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  getMe(customerId: string) {
    return this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        defaultTownId: true,
        defaultTown: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  updateMe(customerId: string, dto: UpdateCustomerProfileDto) {
    const data: any = {};

    if (dto.firstName !== undefined) {
      data.firstName = dto.firstName.trim();
    }

    if (dto.lastName !== undefined) {
      data.lastName = dto.lastName.trim() || null;
    }

    if (dto.phone !== undefined) {
      data.phone = dto.phone.trim();
    }

    return this.prisma.customer.update({
      where: { id: customerId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        defaultTownId: true,
        defaultTown: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateDefaultTown(customerId: string, defaultTownId?: string) {
    const townId = defaultTownId?.trim() || null;

    if (townId) {
      const town = await this.prisma.town.findUnique({
        where: { id: townId },
        select: { id: true, isActive: true, name: true, slug: true },
      });

      if (!town || town.isActive === false) {
        throw new BadRequestException('Selected town is invalid');
      }
    }

    return this.prisma.customer.update({
      where: { id: customerId },
      data: {
        defaultTownId: townId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        defaultTownId: true,
        defaultTown: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  listAddresses(customerId: string) {
    return this.prisma.customerAddress.findMany({
      where: { customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAddress(customerId: string, dto: CreateCustomerAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.customerAddress.updateMany({
          where: { customerId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const hasAny = await tx.customerAddress.count({
        where: { customerId },
      });

      return tx.customerAddress.create({
        data: {
          customerId,
          label: dto.label?.trim() || null,
          recipientName: dto.recipientName.trim(),
          phone: dto.phone?.trim() || null,
          line1: dto.line1.trim(),
          line2: dto.line2?.trim() || null,
          area: dto.area?.trim() || null,
          town: dto.town.trim(),
          landmark: dto.landmark?.trim() || null,
          notes: dto.notes?.trim() || null,
          isDefault: dto.isDefault ?? hasAny === 0,
        },
      });
    });
  }

  async updateAddress(
    customerId: string,
    addressId: string,
    dto: UpdateCustomerAddressDto,
  ) {
    const existing = await this.prisma.customerAddress.findUnique({
      where: { id: addressId },
    });

    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    if (existing.customerId !== customerId) {
      throw new ForbiddenException('You cannot edit this address');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.customerAddress.updateMany({
          where: { customerId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.customerAddress.update({
        where: { id: addressId },
        data: {
          label: dto.label !== undefined ? dto.label?.trim() || null : undefined,
          recipientName:
            dto.recipientName !== undefined ? dto.recipientName.trim() : undefined,
          phone: dto.phone !== undefined ? dto.phone?.trim() || null : undefined,
          line1: dto.line1 !== undefined ? dto.line1.trim() : undefined,
          line2: dto.line2 !== undefined ? dto.line2?.trim() || null : undefined,
          area: dto.area !== undefined ? dto.area?.trim() || null : undefined,
          town: dto.town !== undefined ? dto.town.trim() : undefined,
          landmark:
            dto.landmark !== undefined ? dto.landmark?.trim() || null : undefined,
          notes: dto.notes !== undefined ? dto.notes?.trim() || null : undefined,
          isDefault: dto.isDefault,
        },
      });
    });
  }

  async deleteAddress(customerId: string, addressId: string) {
    const existing = await this.prisma.customerAddress.findUnique({
      where: { id: addressId },
    });

    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    if (existing.customerId !== customerId) {
      throw new ForbiddenException('You cannot delete this address');
    }

    await this.prisma.customerAddress.delete({
      where: { id: addressId },
    });

    return { ok: true };
  }

  async setDefaultAddress(customerId: string, addressId: string) {
    const existing = await this.prisma.customerAddress.findUnique({
      where: { id: addressId },
    });

    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    if (existing.customerId !== customerId) {
      throw new ForbiddenException('You cannot modify this address');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.customerAddress.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false },
      });

      return tx.customerAddress.update({
        where: { id: addressId },
        data: { isDefault: true },
      });
    });
  }

  listOrders(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      include: {
        town: true,
        items: {
          include: {
            townProduct: {
              include: {
                product: true,
                images: {
                  orderBy: { sortOrder: 'asc' },
                  take: 1,
                },
              },
            },
            variant: true,
          },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrder(customerId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        town: true,
        items: {
          include: {
            townProduct: {
              include: {
                product: true,
                images: { orderBy: { sortOrder: 'asc' } },
              },
            },
            variant: true,
            refundItems: true,
          },
        },
        payments: {
          include: {
            Refund: {
              include: {
                items: true,
              },
            },
          },
        },
        sale: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customerId !== customerId) {
      throw new ForbiddenException('You cannot view this order');
    }

    return order;
  }
}