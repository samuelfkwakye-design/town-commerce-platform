import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloneTownProductDto } from './dto/clone-town-product.dto';

@Injectable()
export class AdminTownProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async cloneTownProduct(sourceTownProductId: string, dto: CloneTownProductDto) {
    const copyVariants = dto.copyVariants ?? true;
    const copyImages = dto.copyImages ?? false;
    const copyStock = dto.copyStock ?? false;

    const source = await this.prisma.townProduct.findUnique({
      where: { id: sourceTownProductId },
      include: {
        variants: {
          orderBy: { sortOrder: 'asc' },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        town: true,
        product: true,
      },
    });

    if (!source) {
      throw new BadRequestException('Source town product not found.');
    }

    const targetTownIds = [...new Set(dto.townIds)].filter(Boolean);

    if (!targetTownIds.length) {
      throw new BadRequestException('At least one target town is required.');
    }

    // Prevent cloning to same town for same product if source town included by mistake
    const towns = await this.prisma.town.findMany({
      where: { id: { in: targetTownIds } },
      select: { id: true, name: true, slug: true },
    });

    if (!towns.length) {
      throw new BadRequestException('No valid target towns found.');
    }

    const existing = await this.prisma.townProduct.findMany({
      where: {
        townId: { in: towns.map((t) => t.id) },
        productId: source.productId,
      },
      select: {
        id: true,
        townId: true,
      },
    });

    const existingTownIds = new Set(existing.map((e) => e.townId));

    const created: Array<{
      townId: string;
      townName: string;
      townSlug: string;
      townProductId: string;
    }> = [];

    const skipped: Array<{
      townId: string;
      townName: string;
      townSlug: string;
      reason: string;
    }> = [];

    for (const town of towns) {
      if (town.id === source.townId) {
        skipped.push({
          townId: town.id,
          townName: town.name,
          townSlug: town.slug,
          reason: 'Same town as source',
        });
        continue;
      }

      if (existingTownIds.has(town.id)) {
        skipped.push({
          townId: town.id,
          townName: town.name,
          townSlug: town.slug,
          reason: 'Town product already exists for this product in target town',
        });
        continue;
      }

      const newTownProduct = await this.prisma.townProduct.create({
        data: {
          townId: town.id,
          productId: source.productId,
          pricingModel: source.pricingModel,

          pricePerUnit: source.pricePerUnit,
          costPerUnit: source.costPerUnit,
          pricePerKg: source.pricePerKg,
          costPerKg: source.costPerKg,

          isActive: source.isActive,

          stockQty: copyStock ? source.stockQty : null,
          stockWeightGrams: copyStock ? source.stockWeightGrams : null,
        },
      });

      if (copyVariants && source.pricingModel === 'VARIANT' && source.variants.length) {
        await this.prisma.townProductVariant.createMany({
          data: source.variants.map((v) => ({
            townProductId: newTownProduct.id,
            label: v.label,
            unitPrice: v.unitPrice,
            unitCost: v.unitCost,
            isActive: v.isActive,
            sortOrder: v.sortOrder,
            packWeightGrams: v.packWeightGrams,
          })),
        });
      }

      if (copyImages && source.images.length) {
        await this.prisma.townProductImage.createMany({
          data: source.images.map((img) => ({
            townProductId: newTownProduct.id,
            url: img.url,
            alt: img.alt,
            sortOrder: img.sortOrder,
          })),
        });
      }

      created.push({
        townId: town.id,
        townName: town.name,
        townSlug: town.slug,
        townProductId: newTownProduct.id,
      });
    }

    return {
      source: {
        townProductId: source.id,
        townId: source.townId,
        townName: source.town?.name ?? null,
        townSlug: source.town?.slug ?? null,
        productId: source.productId,
        productName: source.product?.name ?? null,
      },
      options: {
        copyVariants,
        copyImages,
        copyStock,
      },
      summary: {
        requested: targetTownIds.length,
        created: created.length,
        skipped: skipped.length,
      },
      created,
      skipped,
    };
  }
  async cloneCatalogToTown(
  targetTownId: string,
  dto: {
    sourceTownId: string;
    copyVariants?: boolean;
    copyImages?: boolean;
    copyStock?: boolean;
  },
) {
  const copyVariants = dto.copyVariants ?? true;
  const copyImages = dto.copyImages ?? false;
  const copyStock = dto.copyStock ?? false;

  if (!dto.sourceTownId) {
    throw new BadRequestException('sourceTownId is required.');
  }

  if (dto.sourceTownId === targetTownId) {
    throw new BadRequestException('Source town and target town cannot be the same.');
  }

  const [sourceTown, targetTown] = await Promise.all([
    this.prisma.town.findUnique({
      where: { id: dto.sourceTownId },
      select: { id: true, name: true, slug: true },
    }),
    this.prisma.town.findUnique({
      where: { id: targetTownId },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  if (!sourceTown) {
    throw new BadRequestException('Source town not found.');
  }

  if (!targetTown) {
    throw new BadRequestException('Target town not found.');
  }

  const sourceTownProducts = await this.prisma.townProduct.findMany({
    where: { townId: dto.sourceTownId },
    include: {
      product: true,
      variants: {
        orderBy: { sortOrder: 'asc' },
      },
      images: {
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const targetExisting = await this.prisma.townProduct.findMany({
    where: { townId: targetTownId },
    select: {
      id: true,
      productId: true,
    },
  });

  const existingProductIds = new Set(targetExisting.map((x) => x.productId));

  const created: Array<{
    productId: string;
    productName: string | null;
    townProductId: string;
  }> = [];

  const skipped: Array<{
    productId: string;
    productName: string | null;
    reason: string;
  }> = [];

  for (const source of sourceTownProducts) {
    if (existingProductIds.has(source.productId)) {
      skipped.push({
        productId: source.productId,
        productName: source.product?.name ?? null,
        reason: 'Already exists in target town',
      });
      continue;
    }

    const createdTownProduct = await this.prisma.townProduct.create({
      data: {
        townId: targetTownId,
        productId: source.productId,
        pricingModel: source.pricingModel,

        pricePerUnit: source.pricePerUnit,
        costPerUnit: source.costPerUnit,
        pricePerKg: source.pricePerKg,
        costPerKg: source.costPerKg,

        isActive: source.isActive,

        stockQty: copyStock ? source.stockQty : null,
        stockWeightGrams: copyStock ? source.stockWeightGrams : null,
      },
    });

    if (copyVariants && source.pricingModel === 'VARIANT' && source.variants.length) {
      await this.prisma.townProductVariant.createMany({
        data: source.variants.map((v) => ({
          townProductId: createdTownProduct.id,
          label: v.label,
          unitPrice: v.unitPrice,
          unitCost: v.unitCost,
          isActive: v.isActive,
          sortOrder: v.sortOrder,
          packWeightGrams: v.packWeightGrams,
        })),
      });
    }

    if (copyImages && source.images.length) {
      await this.prisma.townProductImage.createMany({
        data: source.images.map((img) => ({
          townProductId: createdTownProduct.id,
          url: img.url,
          alt: img.alt,
          sortOrder: img.sortOrder,
        })),
      });
    }

    created.push({
      productId: source.productId,
      productName: source.product?.name ?? null,
      townProductId: createdTownProduct.id,
    });
  }

  return {
    sourceTown,
    targetTown,
    options: {
      copyVariants,
      copyImages,
      copyStock,
    },
    summary: {
      found: sourceTownProducts.length,
      created: created.length,
      skipped: skipped.length,
    },
    created,
    skipped,
  };
}
async applyPricingToTowns(
  sourceTownProductId: string,
  dto: {
    townIds: string[];
    includeCosts?: boolean;
    applyVariants?: boolean;
  },
) {
  const includeCosts = dto.includeCosts ?? false;
  const applyVariants = dto.applyVariants ?? true;

  const source = await this.prisma.townProduct.findUnique({
    where: { id: sourceTownProductId },
    include: {
      product: true,
      town: true,
      variants: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!source) {
    throw new BadRequestException('Source town product not found.');
  }

  const targetTownIds = [...new Set(dto.townIds)].filter(Boolean);

  if (!targetTownIds.length) {
    throw new BadRequestException('At least one target town is required.');
  }

  const towns = await this.prisma.town.findMany({
    where: { id: { in: targetTownIds } },
    select: { id: true, name: true, slug: true },
  });

  if (!towns.length) {
    throw new BadRequestException('No valid target towns found.');
  }

  const targetTownProducts = await this.prisma.townProduct.findMany({
    where: {
      townId: { in: towns.map((t) => t.id) },
      productId: source.productId,
    },
    include: {
      variants: {
        orderBy: { sortOrder: 'asc' },
      },
      town: true,
    },
  });

  const targetByTownId = new Map(targetTownProducts.map((tp) => [tp.townId, tp]));

  const updated: Array<{
    townId: string;
    townName: string;
    townSlug: string;
    townProductId: string;
  }> = [];

  const skipped: Array<{
    townId: string;
    townName: string;
    townSlug: string;
    reason: string;
  }> = [];

  for (const town of towns) {
    if (town.id === source.townId) {
      skipped.push({
        townId: town.id,
        townName: town.name,
        townSlug: town.slug,
        reason: 'Same town as source',
      });
      continue;
    }

    const target = targetByTownId.get(town.id);

    if (!target) {
      skipped.push({
        townId: town.id,
        townName: town.name,
        townSlug: town.slug,
        reason: 'Product does not exist in target town',
      });
      continue;
    }

    const pricingUpdate: Record<string, any> = {};

    if (source.pricingModel === 'UNIT') {
      pricingUpdate.pricePerUnit = source.pricePerUnit;
      pricingUpdate.pricePerKg = null;

      if (includeCosts) {
        pricingUpdate.costPerUnit = source.costPerUnit;
        pricingUpdate.costPerKg = null;
      }
    } else if (source.pricingModel === 'WEIGHT') {
      pricingUpdate.pricePerKg = source.pricePerKg;
      pricingUpdate.pricePerUnit = null;

      if (includeCosts) {
        pricingUpdate.costPerKg = source.costPerKg;
        pricingUpdate.costPerUnit = null;
      }
    } else if (source.pricingModel === 'VARIANT') {
      pricingUpdate.pricePerUnit = null;
      pricingUpdate.pricePerKg = null;

      if (includeCosts) {
        pricingUpdate.costPerUnit = null;
        pricingUpdate.costPerKg = null;
      }
    }

    await this.prisma.townProduct.update({
      where: { id: target.id },
      data: pricingUpdate,
    });

    if (source.pricingModel === 'VARIANT' && applyVariants) {
      await this.prisma.townProductVariant.deleteMany({
        where: { townProductId: target.id },
      });

      if (source.variants.length) {
        await this.prisma.townProductVariant.createMany({
          data: source.variants.map((v) => ({
            townProductId: target.id,
            label: v.label,
            unitPrice: v.unitPrice,
            unitCost: includeCosts ? v.unitCost : null,
            isActive: v.isActive,
            sortOrder: v.sortOrder,
            packWeightGrams: v.packWeightGrams,
          })),
        });
      }
    }

    updated.push({
      townId: town.id,
      townName: town.name,
      townSlug: town.slug,
      townProductId: target.id,
    });
  }

  return {
    source: {
      townProductId: source.id,
      townId: source.townId,
      townName: source.town?.name ?? null,
      townSlug: source.town?.slug ?? null,
      productId: source.productId,
      productName: source.product?.name ?? null,
      pricingModel: source.pricingModel,
    },
    options: {
      includeCosts,
      applyVariants,
    },
    summary: {
      requested: targetTownIds.length,
      updated: updated.length,
      skipped: skipped.length,
    },
    updated,
    skipped,
  };
}
}
