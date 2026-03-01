import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Param,
  Patch,
  Post,
  Delete,
  Get,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminKeyGuard } from '../auth/admin-key.guard';

@Controller('admin')
@UseGuards(AdminKeyGuard)
export class AdminTownProductsController {
  constructor(private readonly prisma: PrismaService) {}

  // -----------------------------
  // Helpers
  // -----------------------------
  private async ensureTownProduct(townProductId: string) {
    const id = (townProductId ?? '').trim();
    if (!id) throw new BadRequestException('townProductId is required');

    const tp = await this.prisma.townProduct.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!tp) throw new NotFoundException(`TownProduct not found: ${id}`);
    return id;
  }

  private async listImages(townProductId: string) {
    return this.prisma.townProductImage.findMany({
      where: { townProductId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        townProductId: true,
        url: true,
        alt: true,
        sortOrder: true,
        createdAt: true,
      },
    });
  }

  // -----------------------------
  // LIST images
  // GET /admin/town-products/:townProductId/images
  // -----------------------------
  @Get('town-products/:townProductId/images')
  async getImages(@Param('townProductId') townProductId: string) {
    const id = await this.ensureTownProduct(townProductId);
    return this.listImages(id);
  }

  // -----------------------------
  // ADD image(s)
  // POST /admin/town-products/:townProductId/images
  // body: { url, alt } OR { images: [{url, alt}, ...] }
  // -----------------------------
  @Post('town-products/:townProductId/images')
  async addImages(@Param('townProductId') townProductId: string, @Body() body: any) {
    const id = await this.ensureTownProduct(townProductId);

    const rawImages: any[] = Array.isArray(body?.images)
      ? body.images
      : body?.url
        ? [body]
        : [];

    const normalized = rawImages
      .map((img) => ({
        url: String(img?.url ?? '').trim(),
        alt: img?.alt != null ? String(img.alt) : null,
      }))
      .filter((x) => !!x.url);

    if (normalized.length === 0) {
      throw new BadRequestException(
        'Provide either {url, alt} or {images:[{url, alt}, ...]}',
      );
    }

    // Dedupe within request
    const seen = new Set<string>();
    const uniqueIncoming = normalized.filter((img) => {
      if (seen.has(img.url)) return false;
      seen.add(img.url);
      return true;
    });

    // Dedupe against DB by url
    const existing = await this.prisma.townProductImage.findMany({
      where: { townProductId: id, url: { in: uniqueIncoming.map((x) => x.url) } },
      select: { url: true },
    });
    const existingSet = new Set(existing.map((e) => e.url));
    const toCreateRaw = uniqueIncoming.filter((img) => !existingSet.has(img.url));

    if (toCreateRaw.length > 0) {
      const maxAgg = await this.prisma.townProductImage.aggregate({
        where: { townProductId: id },
        _max: { sortOrder: true },
      });

      let nextSort = (maxAgg?._max?.sortOrder ?? -1) + 1;

      await this.prisma.townProductImage.createMany({
        data: toCreateRaw.map((img) => ({
          townProductId: id,
          url: img.url,
          alt: img.alt,
          sortOrder: nextSort++,
        })),
        skipDuplicates: true,
      });
    }

    return this.listImages(id);
  }

  // -----------------------------
  // REORDER images (safe with @@unique([townProductId, sortOrder]))
  // PATCH /admin/town-products/:townProductId/images/reorder
  // body: { orderedImageIds: string[] }
  // -----------------------------
  @Patch('town-products/:townProductId/images/reorder')
  async reorderImages(
    @Param('townProductId') townProductId: string,
    @Body() body: { orderedImageIds: string[] },
  ) {
    const id = await this.ensureTownProduct(townProductId);

    const orderedImageIds = body?.orderedImageIds;
    if (!Array.isArray(orderedImageIds) || orderedImageIds.length === 0) {
      throw new BadRequestException('orderedImageIds must be a non-empty array');
    }

    const existing = await this.prisma.townProductImage.findMany({
      where: { townProductId: id },
      select: { id: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    const existingIds = existing.map((x) => x.id);
    const existingSet = new Set(existingIds);

    for (const imgId of orderedImageIds) {
      if (!existingSet.has(imgId)) {
        throw new BadRequestException(`Image id not found on this product: ${imgId}`);
      }
    }

    // Keep any missing ids at the end (defensive)
    const missing = existingIds.filter((x) => !orderedImageIds.includes(x));
    const finalOrder = [...orderedImageIds, ...missing];

    await this.prisma.$transaction(async (tx) => {
      // Phase 1 temp
      for (let i = 0; i < finalOrder.length; i++) {
        await tx.townProductImage.update({
          where: { id: finalOrder[i] },
          data: { sortOrder: 1000 + i },
        });
      }
      // Phase 2 final
      for (let i = 0; i < finalOrder.length; i++) {
        await tx.townProductImage.update({
          where: { id: finalOrder[i] },
          data: { sortOrder: i },
        });
      }
    });

    return this.listImages(id);
  }

  // -----------------------------
  // SET PRIMARY (move image to sortOrder 0)
  // POST /admin/town-product-images/:imageId/set-primary
  // -----------------------------
  @Post('town-product-images/:imageId/set-primary')
  async setPrimary(@Param('imageId') imageId: string) {
    const img = await this.prisma.townProductImage.findUnique({
      where: { id: imageId },
      select: { id: true, townProductId: true },
    });
    if (!img) throw new NotFoundException('Image not found');

    const images = await this.listImages(img.townProductId);
    const ids = images.map((x) => x.id);
    if (!ids.includes(imageId)) throw new BadRequestException('Image not on this product');

    const newOrder = [imageId, ...ids.filter((x) => x !== imageId)];

    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < newOrder.length; i++) {
        await tx.townProductImage.update({
          where: { id: newOrder[i] },
          data: { sortOrder: 1000 + i },
        });
      }
      for (let i = 0; i < newOrder.length; i++) {
        await tx.townProductImage.update({
          where: { id: newOrder[i] },
          data: { sortOrder: i },
        });
      }
    });

    return this.listImages(img.townProductId);
  }

  // -----------------------------
  // DELETE image
  // DELETE /admin/town-product-images/:imageId
  // -----------------------------
  @Delete('town-product-images/:imageId')
  async deleteImage(@Param('imageId') imageId: string) {
    const img = await this.prisma.townProductImage.findUnique({
      where: { id: imageId },
      select: { id: true, townProductId: true },
    });
    if (!img) throw new NotFoundException('Image not found');

    await this.prisma.townProductImage.delete({ where: { id: imageId } });
    return this.listImages(img.townProductId);
  }

  // -----------------------------
  // PATCH image (optional: edit alt)
  // PATCH /admin/town-product-images/:imageId
  // body: { alt?: string | null }
  // -----------------------------
  @Patch('town-product-images/:imageId')
  async patchImage(
    @Param('imageId') imageId: string,
    @Body() body: { alt?: string | null },
  ) {
    const img = await this.prisma.townProductImage.findUnique({
      where: { id: imageId },
      select: { id: true },
    });
    if (!img) throw new NotFoundException('Image not found');

    const updated = await this.prisma.townProductImage.update({
      where: { id: imageId },
      data: {
        ...(body?.alt !== undefined ? { alt: body.alt } : {}),
      },
      select: {
        id: true,
        townProductId: true,
        url: true,
        alt: true,
        sortOrder: true,
        createdAt: true,
      },
    });

    return updated;
  }
}