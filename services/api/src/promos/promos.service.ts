import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PromoType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromoDto } from './dto/create-promo.dto';

@Injectable()
export class PromosService {
  constructor(private readonly prisma: PrismaService) {}

  async createPromo(dto: CreatePromoDto) {
    const code = dto.code.trim().toUpperCase();

    if (!code) {
      throw new BadRequestException('Promo code is required');
    }

    if (
      (dto.type === PromoType.PERCENTAGE ||
        dto.type === PromoType.FIXED) &&
      (dto.value === undefined || dto.value === null)
    ) {
      throw new BadRequestException(
        'value is required for PERCENTAGE and FIXED promos',
      );
    }

    if (
      dto.type === PromoType.DELIVERY_FREE ||
      dto.type === PromoType.SERVICE_FREE
    ) {
      if (dto.value !== undefined && dto.value !== null) {
        throw new BadRequestException(
          'value should not be provided for DELIVERY_FREE or SERVICE_FREE promos',
        );
      }
    }

    if (
      dto.type === PromoType.PERCENTAGE &&
      (dto.value! <= 0 || dto.value! > 100)
    ) {
      throw new BadRequestException(
        'Percentage promo value must be between 1 and 100',
      );
    }

    if (dto.type === PromoType.FIXED && dto.value! <= 0) {
      throw new BadRequestException(
        'Fixed promo value must be greater than 0',
      );
    }

    if (dto.townId) {
      const town = await this.prisma.town.findUnique({
        where: { id: dto.townId },
        select: { id: true, name: true, slug: true },
      });

      if (!town) {
        throw new NotFoundException(`Town not found: ${dto.townId}`);
      }
    }

    try {
      return await this.prisma.promoCode.create({
        data: {
          code,
          type: dto.type,
          value:
            dto.value === undefined || dto.value === null
              ? null
              : new Prisma.Decimal(dto.value),
          townId: dto.townId ?? null,
          isActive: dto.isActive ?? true,
          expiresAt: dto.expiresAt ?? null,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException('Promo code already exists');
      }
      throw error;
    }
  }

  async validatePromo(code: string) {
    const promo = await this.prisma.promoCode.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: { town: true },
    });

    if (!promo) {
      throw new NotFoundException('Promo code not found');
    }

    if (!promo.isActive) {
      throw new BadRequestException('Promo code is inactive');
    }

    if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Promo code has expired');
    }

    return {
      code: promo.code,
      type: promo.type,
      value: promo.value,
      townId: promo.townId,
      expiresAt: promo.expiresAt,
    };
  }
}