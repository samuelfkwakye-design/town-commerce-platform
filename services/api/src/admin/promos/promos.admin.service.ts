import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminCreatePromoDto } from './dto/admin-create-promo.dto';
import { PromoType, Prisma } from '@prisma/client';

@Injectable()
export class PromosAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listPromos(params?: {
    townId?: string;
    isActive?: string;
    q?: string;
  }) {
    const where: Prisma.PromoCodeWhereInput = {};

    if (params?.townId) {
      where.townId = params.townId;
    }

    if (params?.isActive !== undefined) {
      if (params.isActive === 'true') where.isActive = true;
      if (params.isActive === 'false') where.isActive = false;
    }

    if (params?.q) {
      where.OR = [
        { code: { contains: params.q, mode: 'insensitive' } },
        { town: { name: { contains: params.q, mode: 'insensitive' } } },
        { town: { slug: { contains: params.q, mode: 'insensitive' } } },
      ];
    }

    const rows = await this.prisma.promoCode.findMany({
      where,
      include: {
        town: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            usages: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return { rows };
  }

  async getPromoById(id: string) {
    const promo = await this.prisma.promoCode.findUnique({
      where: { id },
      include: {
        town: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!promo) {
      throw new NotFoundException('Promo not found');
    }

    return promo;
  }

  async createPromo(dto: AdminCreatePromoDto) {
    const code = dto.code.trim().toUpperCase();

    if (!code) {
      throw new BadRequestException('Promo code is required');
    }

    const type = dto.type as PromoType;

    const valueRequired = type === 'PERCENTAGE' || type === 'FIXED';
    const valueForbidden = type === 'DELIVERY_FREE' || type === 'SERVICE_FREE';

    if (valueRequired && (dto.value === undefined || dto.value === null)) {
      throw new BadRequestException(`Value is required for promo type ${type}`);
    }

    if (valueForbidden && dto.value !== undefined && dto.value !== null) {
      throw new BadRequestException(`Value must be empty for promo type ${type}`);
    }

    if (type === 'PERCENTAGE' && dto.value! > 100) {
      throw new BadRequestException('Percentage promo value cannot exceed 100');
    }

    if (dto.townId) {
      const town = await this.prisma.town.findUnique({
        where: { id: dto.townId },
        select: { id: true },
      });

      if (!town) {
        throw new BadRequestException('Selected town does not exist');
      }
    }

    const created = await this.prisma.promoCode.create({
      data: {
        code,
        type,
        value:
          dto.value === undefined || dto.value === null
            ? undefined
            : new Prisma.Decimal(dto.value),
        townId: dto.townId || null,
        isActive: dto.isActive ?? true,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      include: {
        town: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return created;
  }

  async updatePromo(id: string, dto: any) {
    const existing = await this.prisma.promoCode.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        type: true,
        townId: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Promo not found');
    }

    const code = String(dto.code ?? existing.code).trim().toUpperCase();
    if (!code) {
      throw new BadRequestException('Promo code is required');
    }

    const type = (dto.type ?? existing.type) as PromoType;

    const valueRequired = type === 'PERCENTAGE' || type === 'FIXED';
    const valueForbidden = type === 'DELIVERY_FREE' || type === 'SERVICE_FREE';

    if (valueRequired && (dto.value === undefined || dto.value === null || dto.value === '')) {
      throw new BadRequestException(`Value is required for promo type ${type}`);
    }

    if (valueForbidden && dto.value !== undefined && dto.value !== null && dto.value !== '') {
      throw new BadRequestException(`Value must be empty for promo type ${type}`);
    }

    if (
      valueRequired &&
      (!Number.isFinite(Number(dto.value)) || Number(dto.value) < 0)
    ) {
      throw new BadRequestException('Value must be a valid non-negative number');
    }

    if (type === 'PERCENTAGE' && Number(dto.value) > 100) {
      throw new BadRequestException('Percentage promo value cannot exceed 100');
    }

    const nextTownId =
      dto.townId === undefined ? existing.townId : dto.townId || null;

    if (nextTownId) {
      const town = await this.prisma.town.findUnique({
        where: { id: nextTownId },
        select: { id: true },
      });

      if (!town) {
        throw new BadRequestException('Selected town does not exist');
      }
    }

    const updated = await this.prisma.promoCode.update({
      where: { id },
      data: {
        code,
        type,
        value: valueForbidden
          ? null
          : new Prisma.Decimal(dto.value),
        townId: nextTownId,
        isActive:
          dto.isActive === undefined ? undefined : Boolean(dto.isActive),
        expiresAt:
          dto.expiresAt === undefined
            ? undefined
            : dto.expiresAt
              ? new Date(dto.expiresAt)
              : null,
      },
      include: {
        town: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return updated;
  }
}