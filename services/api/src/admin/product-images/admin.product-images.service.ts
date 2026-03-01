import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AdminProductImagesService {
  constructor(private readonly prisma: PrismaService) {}

  async listTownProductImages(townProductId: string) {
    return this.prisma.townProductImage.findMany({
      where: { townProductId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
  }

  // ✅ NEW: create image record for a TownProduct (assign next sortOrder safely)
  async createTownProductImage(
    townProductId: string,
    body: { url: string; alt?: string | null }
  ) {
    const url = (body?.url ?? "").trim();
    if (!url) throw new BadRequestException("url is required");

    // Ensure TownProduct exists
    const tp = await this.prisma.townProduct.findUnique({
      where: { id: townProductId },
      select: { id: true },
    });
    if (!tp) throw new NotFoundException("TownProduct not found");

    // Next sortOrder = max + 1 (unique constraint safe)
    const max = await this.prisma.townProductImage.aggregate({
      where: { townProductId },
      _max: { sortOrder: true },
    });
    const nextSortOrder = (max?._max?.sortOrder ?? -1) + 1;

    try {
      await this.prisma.townProductImage.create({
        data: {
          townProductId,
          url,
          alt: body?.alt ?? null,
          sortOrder: nextSortOrder,
        },
      });
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      // Common: duplicate url unique constraint
      if (msg.includes("Unique constraint")) {
        throw new BadRequestException("This image URL is already attached to this product.");
      }
      throw new BadRequestException(msg);
    }

    return this.listTownProductImages(townProductId);
  }

  /**
   * Reorder images by providing ordered list of imageIds.
   * Uses two-phase update to avoid collisions with @@unique([townProductId, sortOrder]).
   */
  async reorderTownProductImages(townProductId: string, orderedImageIds: string[]) {
    if (!Array.isArray(orderedImageIds) || orderedImageIds.length === 0) {
      throw new BadRequestException("orderedImageIds must be a non-empty array");
    }

    const existing = await this.prisma.townProductImage.findMany({
      where: { townProductId },
      select: { id: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    const existingIds = new Set(existing.map((x) => x.id));
    for (const id of orderedImageIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(`Image id not found on this product: ${id}`);
      }
    }

    const missing = existing.map((x) => x.id).filter((id) => !orderedImageIds.includes(id));
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

    return this.listTownProductImages(townProductId);
  }

  async setPrimary(imageId: string) {
    const img = await this.prisma.townProductImage.findUnique({
      where: { id: imageId },
      select: { id: true, townProductId: true },
    });
    if (!img) throw new NotFoundException("Image not found");

    const townProductId = img.townProductId;

    const current = await this.prisma.townProductImage.findMany({
      where: { townProductId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: { id: true },
    });

    const ids = current.map((x) => x.id);
    if (!ids.includes(imageId)) {
      throw new BadRequestException("Image does not belong to this product");
    }

    const newOrder = [imageId, ...ids.filter((id) => id !== imageId)];

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

    return this.listTownProductImages(townProductId);
  }

  async deleteImage(imageId: string) {
    const img = await this.prisma.townProductImage.findUnique({
      where: { id: imageId },
      select: { id: true, townProductId: true },
    });
    if (!img) throw new NotFoundException("Image not found");

    await this.prisma.townProductImage.delete({ where: { id: imageId } });
    return this.listTownProductImages(img.townProductId);
  }

  async patchImage(imageId: string, data: { alt?: string | null }) {
    const img = await this.prisma.townProductImage.findUnique({
      where: { id: imageId },
      select: { id: true },
    });
    if (!img) throw new NotFoundException("Image not found");

    return this.prisma.townProductImage.update({
      where: { id: imageId },
      data: {
        ...(data.alt !== undefined ? { alt: data.alt } : {}),
      },
    });
  }
}