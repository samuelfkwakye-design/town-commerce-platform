import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PricingModel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTownProductDto } from './dto/create-town-product.dto';
import { UpdateTownProductDto } from './dto/update-town-product.dto';

@Injectable()
export class TownProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private toDecimal(value?: string | number | null): Prisma.Decimal | null {
    if (value === undefined || value === null) return null;
    return new Prisma.Decimal(String(value));
  }

  private enforcePricingRules(input: {
    pricingModel: PricingModel;
    pricePerUnit: unknown;
    pricePerKg: unknown;
  }) {
    const { pricingModel, pricePerUnit, pricePerKg } = input;

    const hasUnit = pricePerUnit !== undefined && pricePerUnit !== null;
    const hasKg = pricePerKg !== undefined && pricePerKg !== null;

    if (pricingModel === PricingModel.UNIT) {
      if (!hasUnit) throw new BadRequestException('pricingModel=UNIT requires pricePerUnit');
      if (hasKg) throw new BadRequestException('pricingModel=UNIT must not include pricePerKg');
    }

    if (pricingModel === PricingModel.WEIGHT) {
      if (!hasKg) throw new BadRequestException('pricingModel=WEIGHT requires pricePerKg');
      if (hasUnit) throw new BadRequestException('pricingModel=WEIGHT must not include pricePerUnit');
    }
  }

  async create(dto: CreateTownProductDto) {
    const [town, product] = await Promise.all([
      this.prisma.town.findUnique({ where: { id: dto.townId } }),
      this.prisma.product.findUnique({ where: { id: dto.productId } }),
    ]);

    if (!town) throw new NotFoundException(`Town not found: ${dto.townId}`);
    if (!product) throw new NotFoundException(`Product not found: ${dto.productId}`);

    const pricingModel = dto.pricingModel as PricingModel;

    this.enforcePricingRules({
      pricingModel,
      pricePerUnit: dto.pricePerUnit,
      pricePerKg: dto.pricePerKg,
    });

    try {
      return await this.prisma.townProduct.create({
        data: {
          townId: dto.townId,
          productId: dto.productId,
          pricingModel,

          pricePerUnit: pricingModel === PricingModel.UNIT ? this.toDecimal(dto.pricePerUnit)! : null,
          pricePerKg: pricingModel === PricingModel.WEIGHT ? this.toDecimal(dto.pricePerKg)! : null,

          stockQty: dto.stockQty ?? null,
          stockWeightGrams: dto.stockWeightGrams ?? null,

          isActive: dto.isActive ?? true,
        },
        include: { town: true, product: true },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('This product is already listed for this town');
      }
      throw e;
    }
  }

  async findAll(filters?: { townId?: string; productId?: string; isActive?: boolean }) {
    return this.prisma.townProduct.findMany({
      where: {
        ...(filters?.townId ? { townId: filters.townId } : {}),
        ...(filters?.productId ? { productId: filters.productId } : {}),
        ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
      },
      include: { town: true, product: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const tp = await this.prisma.townProduct.findUnique({
      where: { id },
      include: { town: true, product: true },
    });

    if (!tp) throw new NotFoundException(`TownProduct not found: ${id}`);
    return tp;
  }

  async update(id: string, dto: UpdateTownProductDto) {
    const existing = await this.prisma.townProduct.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`TownProduct not found: ${id}`);

    const finalPricingModel = (dto.pricingModel ?? existing.pricingModel) as PricingModel;

    const finalPricePerUnit =
      dto.pricePerUnit !== undefined ? dto.pricePerUnit : existing.pricePerUnit;

    const finalPricePerKg =
      dto.pricePerKg !== undefined ? dto.pricePerKg : existing.pricePerKg;

    this.enforcePricingRules({
      pricingModel: finalPricingModel,
      pricePerUnit: finalPricePerUnit,
      pricePerKg: finalPricePerKg,
    });

    return this.prisma.townProduct.update({
      where: { id },
      data: {
        pricingModel: finalPricingModel,

        pricePerUnit:
          finalPricingModel === PricingModel.UNIT ? this.toDecimal(finalPricePerUnit as any) : null,

        pricePerKg:
          finalPricingModel === PricingModel.WEIGHT ? this.toDecimal(finalPricePerKg as any) : null,

        ...(dto.stockQty !== undefined ? { stockQty: dto.stockQty } : {}),
        ...(dto.stockWeightGrams !== undefined ? { stockWeightGrams: dto.stockWeightGrams } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: { town: true, product: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.townProduct.delete({ where: { id } });
  }
}
