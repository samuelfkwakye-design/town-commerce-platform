import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PromosAdminService } from './promos.admin.service';
import { AdminCreatePromoDto } from './dto/admin-create-promo.dto';

@Controller('admin/promos')
export class PromosAdminController {
  constructor(private readonly promosAdminService: PromosAdminService) {}

  @Get()
  listPromos(
    @Query('townId') townId?: string,
    @Query('isActive') isActive?: string,
    @Query('q') q?: string,
  ) {
    return this.promosAdminService.listPromos({ townId, isActive, q });
  }

  @Post()
  createPromo(@Body() dto: AdminCreatePromoDto) {
    return this.promosAdminService.createPromo(dto);
  }
}