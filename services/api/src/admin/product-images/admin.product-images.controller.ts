import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AdminKeyGuard } from "../../auth/admin-key.guard";
import { AdminProductImagesService } from "./admin.product-images.service";

@Controller("admin")
@UseGuards(AdminKeyGuard)
export class AdminProductImagesController {
  constructor(private readonly svc: AdminProductImagesService) {}

  @Get("town-products/:townProductId/images")
  async list(@Param("townProductId") townProductId: string) {
    return this.svc.listTownProductImages(townProductId);
  }

  // ✅ ADD IMAGE (attach Cloudinary URL to product)
  @Post("town-products/:townProductId/images")
  async create(
    @Param("townProductId") townProductId: string,
    @Body() body: { url: string; alt?: string | null }
  ) {
    return this.svc.createTownProductImage(townProductId, body);
  }

  @Patch("town-products/:townProductId/images/reorder")
  async reorder(
    @Param("townProductId") townProductId: string,
    @Body() body: { orderedImageIds: string[] }
  ) {
    return this.svc.reorderTownProductImages(townProductId, body?.orderedImageIds);
  }

  @Post("town-product-images/:imageId/set-primary")
  async setPrimary(@Param("imageId") imageId: string) {
    return this.svc.setPrimary(imageId);
  }

  @Patch("town-product-images/:imageId")
  async patch(@Param("imageId") imageId: string, @Body() body: { alt?: string | null }) {
    return this.svc.patchImage(imageId, body ?? {});
  }

  @Delete("town-product-images/:imageId")
  async remove(@Param("imageId") imageId: string) {
    return this.svc.deleteImage(imageId);
  }
}