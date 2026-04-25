import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminAuthModule } from '../../admin-auth/admin-auth.module';
import { AdminDriverPayoutsController } from './admin-driver-payouts.controller';
import { AdminDriverPayoutsService } from './admin-driver-payouts.service';

@Module({
  imports: [PrismaModule, AdminAuthModule],
  controllers: [AdminDriverPayoutsController],
  providers: [AdminDriverPayoutsService],
})
export class AdminDriverPayoutsModule {}
