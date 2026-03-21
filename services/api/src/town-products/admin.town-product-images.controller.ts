import { Controller, Param, Post, UseGuards, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminKeyGuard } from '../auth/admin-key.guard';

@Controller('admin/town-product-images')
@UseGuards(AdminKeyGuard)
export class AdminTownProductImagesController {
  constructor(private readonly prisma: PrismaService) {}

  @Post(':imageId/set-primary')
  async setPrimary(@Param('imageId') imageId: string) {
    const img = await this.prisma.townProductImage.findUnique({
      where: { id: imageId },
      select: { id: true, townProductId: true },
    });

    if (!img) throw new NotFoundException('TownProductImage not found');

    const townProductId = img.townProductId;

    await this.prisma.$transaction(async (tx) => {
      await tx.townProductImage.update({
        where: { id: imageId },
        data: { sortOrder: 0 },
      });

      await tx.townProductImage.updateMany({
        where: { townProductId, id: { not: imageId } },
        data: { sortOrder: { increment: 1 } },
      });

      const all = await tx.townProductImage.findMany({
        where: { townProductId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: { id: true },
      });

      for (let i = 0; i < all.length; i++) {
        await tx.townProductImage.update({
          where: { id: all[i].id },
          data: { sortOrder: i },
        });
      }
    });

    return { ok: true };
  }
}
