import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TownSettingsService } from './town-settings.service';
import { AdminKeyGuard } from '../auth/admin-key.guard';

@Controller()
export class TownSettingsController {
  constructor(private readonly townSettingsService: TownSettingsService) {}

  @Get('town-settings/by-slug/:townSlug')
  getByTownSlug(@Param('townSlug') townSlug: string) {
    return this.townSettingsService.getByTownSlug(townSlug);
  }

  @UseGuards(AdminKeyGuard)
  @Get('admin/town-settings/:townId')
  getByTown(@Param('townId') townId: string) {
    return this.townSettingsService.getByTown(townId);
  }

  @UseGuards(AdminKeyGuard)
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
  ) {
    return this.townSettingsService.upsert(townId, body);
  }
}