import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { PromosAdminService } from './promos.admin.service';
import { AdminCreatePromoDto } from './dto/admin-create-promo.dto';
import { AdminJwtGuard } from '../../admin-auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../admin-auth/roles.guard';

@Controller('admin/promos')
@UseGuards(AdminJwtGuard, RolesGuard)
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

  @Get(':id')
  getPromoById(@Param('id') id: string) {
    return this.promosAdminService.getPromoById(id);
  }

  @Post()
  createPromo(@Body() dto: AdminCreatePromoDto) {
    return this.promosAdminService.createPromo(dto);
  }

  @Patch(':id')
  updatePromo(@Param('id') id: string, @Body() dto: any) {
    return this.promosAdminService.updatePromo(id, dto);
  }
}