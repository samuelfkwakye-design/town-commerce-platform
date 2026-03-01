import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogQueryDto } from './dto/catalog.query.dto';
import { PricingModel } from '@prisma/client';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getCatalog(q: CatalogQueryDto) {
    // ✅ Prevent Prisma validation error when townSlug is missing/undefined
    const townSlug = (q.townSlug ?? '').trim();
    if (!townSlug) {
      throw new BadRequestException('Missing required query param: townSlug');
    }

    const town = await this.prisma.town.findUnique({
      where: { slug: townSlug },
      select: { id: true, name: true, slug: true },
    });

    if (!town) throw new NotFoundException(`Town not found: ${townSlug}`);

    const search = (q.search ?? '').trim();
    const categorySlug = (q.categorySlug ?? '').trim();

    const rows = await this.prisma.townProduct.findMany({
      where: {
        townId: town.id,
        isActive: true,
        product: {
          isActive: true,
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { description: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {}),
          ...(categorySlug
            ? {
                category: {
                  slug: categorySlug,
                  isActive: true,
                },
              }
            : {}),
        },
      },
      select: {
        id: true,
        productId: true,
        pricingModel: true,
        pricePerUnit: true,
        pricePerKg: true,

        // ✅ VARIANTS (active only, ordered)
        variants: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
          select: {
            id: true,
            label: true,
            unitPrice: true,
            packWeightGrams: true,
          },
        },

        // ✅ IMAGES (ordered)
        images: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: {
            url: true,
            alt: true,
            sortOrder: true,
          },
        },

        product: {
          select: {
            name: true,
            description: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                isActive: true,
                sortOrder: true,
              },
            },
          },
        },
      },
      orderBy: [{ product: { name: 'asc' } }],
    });

    const buckets = new Map<string, any>();
    const uncategorizedKey = '__uncategorized__';

    for (const tp of rows) {
      const cat = tp.product.category;
      const isActiveCategory = !!cat && cat.isActive;

      const key = isActiveCategory ? (cat!.id as string) : uncategorizedKey;

      if (!buckets.has(key)) {
        buckets.set(key, {
          id: isActiveCategory ? cat!.id : null,
          name: isActiveCategory ? cat!.name : 'Uncategorized',
          slug: isActiveCategory ? cat!.slug : null,
          sortOrder: isActiveCategory ? (cat!.sortOrder ?? 0) : 999999,
          products: [],
        });
      }

      buckets.get(key).products.push({
        townProductId: tp.id,
        productId: tp.productId,
        name: tp.product.name,
        description: tp.product.description ?? null,
        pricingModel: tp.pricingModel,

        // UNIT
        pricePerUnit: tp.pricePerUnit ? tp.pricePerUnit.toString() : null,

        // WEIGHT (per kg)
        pricePerKg: tp.pricePerKg ? tp.pricePerKg.toString() : null,

        // ✅ IMAGES
        images: (tp.images ?? []).map((img) => ({
          url: img.url,
          alt: img.alt ?? null,
          sortOrder: img.sortOrder,
        })),

        // VARIANT
        variants:
          tp.pricingModel === PricingModel.VARIANT
            ? tp.variants.map((v) => ({
                id: v.id,
                label: v.label,
                unitPrice: v.unitPrice.toString(),
                packWeightGrams: v.packWeightGrams ?? null,
              }))
            : [],
      });
    }

    const categories = Array.from(buckets.values())
      .map((c: any) => ({
        ...c,
        products: c.products.sort((a: any, b: any) =>
          a.name.localeCompare(b.name),
        ),
      }))
      .sort((a: any, b: any) => {
        const so = a.sortOrder - b.sortOrder;
        if (so !== 0) return so;
        return a.name.localeCompare(b.name);
      });

    return {
      town,
      filters: {
        townSlug,
        search: search || null,
        categorySlug: categorySlug || null,
      },
      categories,
    };
  }
}