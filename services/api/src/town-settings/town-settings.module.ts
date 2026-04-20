import { Module } from '@nestjs/common';
import { TownSettingsController } from './town-settings.controller';
import { TownSettingsService } from './town-settings.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Module({
  imports: [PrismaModule, AdminAuthModule],
  controllers: [TownSettingsController],
  providers: [TownSettingsService],
  exports: [TownSettingsService],
})
export class TownSettingsModule {}