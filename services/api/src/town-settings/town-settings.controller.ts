import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { TownSettingsService } from './town-settings.service';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles, AdminRole } from '../common/auth/roles.decorator';

@Controller()
export class TownSettingsController {
  constructor(private readonly townSettingsService: TownSettingsService) {}

  @Get('town-settings/by-slug/:townSlug')
  getByTownSlug(@Param('townSlug') townSlug: string) {
    return this.townSettingsService.getByTownSlug(townSlug);
  }

  @UseGuards(AdminJwtGuard, RolesGuard)
  @Roles(AdminRole.GLOBAL_SUPER_ADMIN, AdminRole.TOWN_SUPER_ADMIN)
  @Get('admin/town-settings/:townId')
  getByTown(@Param('townId') townId: string, @Req() req: any) {
    return this.townSettingsService.getByTown(townId);
  }

  @UseGuards(AdminJwtGuard, RolesGuard)
  @Roles(AdminRole.GLOBAL_SUPER_ADMIN, AdminRole.TOWN_SUPER_ADMIN)
  @Post('admin/town-settings/:townId')
  upsert(
    @Param('townId') townId: string,
    @Body()
    body: {
      deliveryFee?: string;
      serviceFee?: string;
      minimumOrder?: string;
      currency?: string;
    },
    @Req() req: any,
  ) {
    return this.townSettingsService.upsert(townId, body);
  }
}