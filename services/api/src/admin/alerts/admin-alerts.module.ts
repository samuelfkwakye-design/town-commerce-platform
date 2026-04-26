import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminAuthModule } from '../../admin-auth/admin-auth.module';
import { AdminAlertsController } from './admin-alerts.controller';
import { AdminAlertsService } from './admin-alerts.service';

@Module({
  imports: [PrismaModule, AdminAuthModule],
  controllers: [AdminAlertsController],
  providers: [AdminAlertsService],
})
export class AdminAlertsModule {}
