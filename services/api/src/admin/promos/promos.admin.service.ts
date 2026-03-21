import {
  BadRequestException,
  Injectable,
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
}
