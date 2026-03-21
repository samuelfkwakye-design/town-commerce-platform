import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminKeyGuard } from '../auth/admin-key.guard';
type VariantInput = {
  label: string;
  unitPrice: string | number;
  unitCost?: string | number | null;
  isActive?: boolean;
  sortOrder?: number;
  packWeightGrams?: number | null;
};

function toDecimal(v: any, field: string) {
  // Prisma Decimal fields accept numbers (it will serialize) OR Prisma.Decimal.
  // We validate and send number.
  if (v === null || v === undefined || v === '') {
    throw new BadRequestException(`${field} is required`);
  }
  const n = Number(v);
  if (!Number.isFinite(n)) throw new BadRequestException(`Invalid ${field}: ${v}`);
  return n;
}

function toDecimalOrNull(v: any, field: string) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new BadRequestException(`Invalid ${field}: ${v}`);
  return n;
}

function toIntOrNull(v: any, field: string) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new BadRequestException(`Invalid ${field}: ${v}`);
  return Math.trunc(n);
}

@Controller('admin/town-products')
@UseGuards(AdminKeyGuard)
export class AdminTownProductVariantsController {
  constructor(private readonly prisma: PrismaService) {}

  // GET /api/v1/admin/town-products/:id/variants
  @Get(':id/variants')
  async list(@Param('id') townProductId: string) {
    const rows = await this.prisma.townProductVariant.findMany({
      where: { townProductId },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
    return { rows };
  }

  // PUT /api/v1/admin/town-products/:id/variants (replace all variants)
  @Put(':id/variants')
  async replaceAll(
    @Param('id') townProductId: string,
    @Body() body: { variants: VariantInput[] },
  ) {
    const variants = body?.variants ?? [];
    if (!Array.isArray(variants)) {
      throw new BadRequestException('variants must be an array');
    }

    for (const v of variants) {
      if (!v?.label || !String(v.label).trim()) {
        throw new BadRequestException('variant.label is required');
      }
      // unitPrice required
      toDecimal(v.unitPrice, 'unitPrice');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const tp = await tx.townProduct.findUnique({ where: { id: townProductId } });
      if (!tp) throw new BadRequestException('TownProduct not found');

      await tx.townProductVariant.deleteMany({ where: { townProductId } });

      if (variants.length > 0) {
        await tx.townProductVariant.createMany({
          data: variants.map((v, idx) => ({
            townProductId,
            label: String(v.label).trim(),
            unitPrice: toDecimal(v.unitPrice, 'unitPrice'),
            unitCost: toDecimalOrNull(v.unitCost, 'unitCost'),
            isActive: v.isActive ?? true,
            sortOrder: Number.isFinite(Number(v.sortOrder)) ? Number(v.sortOrder) : idx,
            packWeightGrams: toIntOrNull(v.packWeightGrams, 'packWeightGrams'),
          })),
        });
      }

      const rows = await tx.townProductVariant.findMany({
        where: { townProductId },
        orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      });

      return { rows };
    });

    return result;
  }
}
