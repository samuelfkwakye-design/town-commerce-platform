import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles, AdminRole } from '../common/auth/roles.decorator';
import { CloneTownProductDto } from './dto/clone-town-product.dto';
import { ApplyTownProductPricingDto } from './dto/apply-town-product-pricing.dto';
import { AdminTownProductsService } from './admin.town-products.service';

@Controller('admin/town-products')
@UseGuards(AdminJwtGuard, RolesGuard)
export class AdminTownProductsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminTownProductsService: AdminTownProductsService,
  ) {}

   @Post(':id/clone')
  @Roles(AdminRole.GLOBAL_SUPER_ADMIN, AdminRole.TOWN_SUPER_ADMIN)
  async cloneTownProduct(
    @Param('id') id: string,
    @Body() body: CloneTownProductDto,
  ) {
    return this.adminTownProductsService.cloneTownProduct(id, body);
  }

    @Post(':id/apply-pricing')
  @Roles(AdminRole.GLOBAL_SUPER_ADMIN, AdminRole.TOWN_SUPER_ADMIN)
  async applyPricingToTowns(
    @Param('id') id: string,
    @Body() body: ApplyTownProductPricingDto,
  ) {
    return this.adminTownProductsService.applyPricingToTowns(id, body);
  }

  // -----------------------------
  // META
  // GET /admin/town-products/meta/categories
  // -----------------------------
    @Get('meta/categories')
  @Roles(
    AdminRole.GLOBAL_SUPER_ADMIN,
    AdminRole.TOWN_SUPER_ADMIN,
    AdminRole.WAREHOUSE_ADMIN,
  )
  async listCategories() {
  const rows = await this.prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      sortOrder: true,
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  return {
    rows: rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
      productCount: row._count.products,
    })),
  };
}
  // -----------------------------
  // META CREATE
  // POST /admin/town-products/meta/categories
  // -----------------------------
    @Post('meta/categories')
  @Roles(AdminRole.GLOBAL_SUPER_ADMIN, AdminRole.TOWN_SUPER_ADMIN)
  async createCategory(@Body() body: any) {
    const name = String(body?.name ?? '').trim();
    const slugInput = String(body?.slug ?? '').trim();

    if (!name) {
      throw new BadRequestException('Category name is required');
    }

    const slug = (slugInput || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    if (!slug) {
      throw new BadRequestException('Valid category slug could not be generated');
    }

    const existingByName = await this.prisma.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true, name: true, slug: true },
    });

    if (existingByName) {
      throw new BadRequestException(
        `Category already exists with name: ${existingByName.name}`,
      );
    }

    const existingBySlug = await this.prisma.category.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true },
    });

    if (existingBySlug) {
      throw new BadRequestException(
        `Category slug already exists: ${existingBySlug.slug}`,
      );
    }

    const maxSort = await this.prisma.category.aggregate({
      _max: { sortOrder: true },
    });

    const created = await this.prisma.category.create({
      data: {
        name,
        slug,
        isActive: true,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        sortOrder: true,
      },
    });

    return created;
  }
    // -----------------------------
  // META UPDATE
  // PATCH /admin/town-products/meta/categories/:id
  // -----------------------------
    @Patch('meta/categories/:id')
  @Roles(AdminRole.GLOBAL_SUPER_ADMIN, AdminRole.TOWN_SUPER_ADMIN)
  async updateCategory(@Param('id') id: string, @Body() body: any) {
    const existing = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, isActive: true, sortOrder: true },
    });

    if (!existing) {
      throw new BadRequestException('Category not found');
    }

    const data: any = {};

    if (body.name !== undefined) {
      const name = String(body.name ?? '').trim();
      if (!name) {
        throw new BadRequestException('Category name cannot be empty');
      }

      const duplicateName = await this.prisma.category.findFirst({
        where: {
          id: { not: id },
          name: { equals: name, mode: 'insensitive' },
        },
        select: { id: true, name: true },
      });

      if (duplicateName) {
        throw new BadRequestException(`Another category already uses name: ${duplicateName.name}`);
      }

      data.name = name;
    }

    if (body.slug !== undefined) {
      const slug = String(body.slug ?? '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

      if (!slug) {
        throw new BadRequestException('Category slug cannot be empty');
      }

      const duplicateSlug = await this.prisma.category.findFirst({
        where: {
          id: { not: id },
          slug,
        },
        select: { id: true, slug: true },
      });

      if (duplicateSlug) {
        throw new BadRequestException(`Another category already uses slug: ${duplicateSlug.slug}`);
      }

      data.slug = slug;
    }

    if (body.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
    }

    if (body.sortOrder !== undefined) {
      const n = Number(body.sortOrder);
      if (Number.isNaN(n)) {
        throw new BadRequestException('sortOrder must be a number');
      }
      data.sortOrder = Math.trunc(n);
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        sortOrder: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      isActive: updated.isActive,
      sortOrder: updated.sortOrder,
      productCount: updated._count.products,
    };
  }
    // -----------------------------
  // META DELETE
  // DELETE /admin/town-products/meta/categories/:id
  // -----------------------------
  @Post('meta/categories/:id/delete')
  async deleteCategory(@Param('id') id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            products: true,
          },
        },
      } as any,
    });

    if (!category) {
      throw new BadRequestException('Category not found');
    }

    await this.prisma.category.delete({
      where: { id },
    });

    return {
      success: true,
      deletedCategoryId: id,
      deletedCategoryName: category.name,
      affectedProducts: (category as any)._count?.products ?? 0,
      message: `Category deleted. ${(category as any)._count?.products ?? 0} product(s) moved to Uncategorized.`,
    };
  }
  // -----------------------------
  // LIST (paged)
  // GET /admin/town-products?townId=&search=&missingImages=&cursor=&limit=
  // -----------------------------
 @Get()
@Roles(
  AdminRole.GLOBAL_SUPER_ADMIN,
  AdminRole.TOWN_SUPER_ADMIN,
  AdminRole.WAREHOUSE_ADMIN,
)
async listTownProducts(
  @Query('townId') townId?: string,
  @Query('search') search?: string,
  @Query('missingImages') missingImages?: string,
  @Query('categoryId') categoryId?: string,
  @Query('cursor') cursor?: string,
  @Query('limit') limit?: string,
) {
  const take = Math.min(Math.max(Number(limit ?? 50), 1), 200);
  const onlyMissing = missingImages === 'true';
  const q = (search ?? '').trim();
  const categoryFilter = (categoryId ?? '').trim();

  const where: any = {
    ...(townId ? { townId } : {}),
    ...(onlyMissing ? { images: { none: {} } } : {}),
  };

  if (q) {
    where.product = {
      ...(where.product ?? {}),
      name: { contains: q, mode: 'insensitive' },
    };
  }

  if (categoryFilter === 'uncategorized') {
    where.product = {
      ...(where.product ?? {}),
      categoryId: null,
    };
  } else if (categoryFilter) {
    where.product = {
      ...(where.product ?? {}),
      categoryId: categoryFilter,
    };
  }

  const rows = await this.prisma.townProduct.findMany({
    where,
    orderBy: { id: 'asc' },
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: take + 1,
    select: {
      id: true,
      townId: true,
      pricingModel: true,
      stockQty: true,
      stockWeightGrams: true,
      product: {
        select: {
          name: true,
          categoryId: true,
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
      town: { select: { name: true, slug: true } },
      _count: { select: { images: true } },
      images: {
        orderBy: { sortOrder: 'asc' },
        take: 1,
        select: { id: true, url: true, alt: true, sortOrder: true },
      },
    },
  });

  const hasNextPage = rows.length > take;
  const page = hasNextPage ? rows.slice(0, take) : rows;
  const nextCursor = hasNextPage ? page[page.length - 1].id : null;

  return {
    filters: {
      townId: townId ?? null,
      search: q || null,
      missingImages: onlyMissing,
      categoryId: categoryFilter || null,
    },
    rows: page.map((tp) => ({
      id: tp.id,
      townId: tp.townId,
      townName: tp.town?.name ?? null,
      townSlug: tp.town?.slug ?? null,
      productName: tp.product?.name ?? null,
      categoryId: tp.product?.categoryId ?? null,
      categoryName: tp.product?.category?.name ?? null,
      categorySlug: tp.product?.category?.slug ?? null,
      pricingModel: tp.pricingModel,
      stockQty: tp.stockQty ?? null,
      stockWeightGrams: tp.stockWeightGrams ?? null,
      imagesCount: tp._count.images ?? 0,
      primaryImageUrl: tp.images?.[0]?.url ?? null,
    })),
    pageInfo: { limit: take, hasNextPage, nextCursor },
  };
}
  // -----------------------------
  // CREATE (Product + TownProduct)
  // POST /admin/town-products
  // -----------------------------
  @Post()
  async createTownProduct(@Body() body: any) {
    const productName = String(body.productName ?? '').trim();
    if (!productName) throw new BadRequestException('productName is required');

    const townId = String(body.townId ?? '').trim();
    if (!townId) throw new BadRequestException('townId is required');

    const pricingModel = String(body.pricingModel ?? '').trim();
    if (!pricingModel) throw new BadRequestException('pricingModel is required');

    const categoryId =
      body.categoryId === undefined || body.categoryId === null || String(body.categoryId).trim() === ''
        ? null
        : String(body.categoryId).trim();

    if (categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true, name: true, isActive: true },
      });

      if (!category) {
        throw new BadRequestException('Invalid categoryId');
      }

      if (!category.isActive) {
        throw new BadRequestException('Selected category is inactive');
      }
    }

    const toNumberOrNull = (v: any) => {
      if (v === undefined) return undefined;
      if (v === null || v === '') return null;
      const n = Number(v);
      if (Number.isNaN(n)) throw new BadRequestException(`Invalid number: ${v}`);
      return n;
    };

    const toIntOrNull = (v: any) => {
      if (v === undefined) return undefined;
      if (v === null || v === '') return null;
      const n = Number(v);
      if (Number.isNaN(n)) throw new BadRequestException(`Invalid integer: ${v}`);
      return Math.trunc(n);
    };

    const product = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.product.findFirst({
        where: { name: productName },
        select: { id: true, name: true },
      });

      if (existing) {
        await tx.product.update({
          where: { id: existing.id },
          data: {
            ...(body.description !== undefined ? { description: body.description } : {}),
            ...(body.productIsActive !== undefined
              ? { isActive: Boolean(body.productIsActive) }
              : {}),
            ...(body.categoryId !== undefined ? { categoryId } : {}),
          },
        });

        return existing;
      }

      return tx.product.create({
        data: {
          name: productName,
          description: body.description ?? null,
          categoryId,
          isActive:
            body.productIsActive === undefined ? true : Boolean(body.productIsActive),
        },
        select: { id: true, name: true },
      });
    });

    const existingListing = await this.prisma.townProduct.findFirst({
      where: { townId, productId: product.id },
      select: { id: true },
    });

    if (existingListing) {
      throw new BadRequestException(
        `TownProduct already exists for this town + product (id=${existingListing.id})`,
      );
    }

    const tp = await this.prisma.townProduct.create({
      data: {
        townId,
        productId: product.id,
        pricingModel: pricingModel as any,

        ...(body.pricePerUnit !== undefined
          ? { pricePerUnit: toNumberOrNull(body.pricePerUnit) }
          : {}),
        ...(body.pricePerKg !== undefined
          ? { pricePerKg: toNumberOrNull(body.pricePerKg) }
          : {}),
        ...(body.costPerUnit !== undefined
          ? { costPerUnit: toNumberOrNull(body.costPerUnit) }
          : {}),
        ...(body.costPerKg !== undefined
          ? { costPerKg: toNumberOrNull(body.costPerKg) }
          : {}),

        ...(body.stockQty !== undefined ? { stockQty: toIntOrNull(body.stockQty) } : {}),
        ...(body.stockWeightGrams !== undefined
          ? { stockWeightGrams: toIntOrNull(body.stockWeightGrams) }
          : {}),

        ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
        town: true,
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });

    return tp;
  }

  // -----------------------------
  // GET ONE
  // GET /admin/town-products/:id
  // -----------------------------
  @Get(':id')
  async getOne(@Param('id') id: string) {
    const tp = await this.prisma.townProduct.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            category: true,
          },
        },
        town: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] },
      },
    });

    if (!tp) throw new BadRequestException('TownProduct not found');
    return tp;
  }

  // -----------------------------
  // UPDATE
  // PATCH /admin/town-products/:id
  // -----------------------------
  @Patch(':id')
  async updateTownProduct(@Param('id') id: string, @Body() body: any) {
    const existing = await this.prisma.townProduct.findUnique({
      where: { id },
      select: { id: true, productId: true },
    });

    if (!existing) {
      throw new BadRequestException('TownProduct not found');
    }

    const toNumberOrNull = (v: any) => {
      if (v === undefined) return undefined;
      if (v === null || v === '') return null;
      const n = Number(v);
      if (Number.isNaN(n)) throw new BadRequestException(`Invalid number: ${v}`);
      return n;
    };

    const toIntOrNull = (v: any) => {
      if (v === undefined) return undefined;
      if (v === null || v === '') return null;
      const n = Number(v);
      if (Number.isNaN(n)) throw new BadRequestException(`Invalid integer: ${v}`);
      return Math.trunc(n);
    };

    const data: any = {};

    if (body.pricingModel !== undefined) data.pricingModel = body.pricingModel;

    if (body.pricePerUnit !== undefined) data.pricePerUnit = toNumberOrNull(body.pricePerUnit);
    if (body.pricePerKg !== undefined) data.pricePerKg = toNumberOrNull(body.pricePerKg);

    if (body.costPerUnit !== undefined) data.costPerUnit = toNumberOrNull(body.costPerUnit);
    if (body.costPerKg !== undefined) data.costPerKg = toNumberOrNull(body.costPerKg);

    if (body.stockQty !== undefined) data.stockQty = toIntOrNull(body.stockQty);
    if (body.stockWeightGrams !== undefined) {
      data.stockWeightGrams = toIntOrNull(body.stockWeightGrams);
    }

    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

    const categoryId =
      body.categoryId === undefined || body.categoryId === null || String(body.categoryId).trim() === ''
        ? null
        : String(body.categoryId).trim();

    if (body.categoryId !== undefined) {
      if (categoryId) {
        const category = await this.prisma.category.findUnique({
          where: { id: categoryId },
          select: { id: true, isActive: true },
        });

        if (!category) {
          throw new BadRequestException('Invalid categoryId');
        }

        if (!category.isActive) {
          throw new BadRequestException('Selected category is inactive');
        }
      }

      await this.prisma.product.update({
        where: { id: existing.productId },
        data: { categoryId },
      });
    }

    const updated = await this.prisma.townProduct.update({
      where: { id },
      data,
      include: {
        product: {
          include: {
            category: true,
          },
        },
        town: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] },
      },
    });

    return updated;
  }
}