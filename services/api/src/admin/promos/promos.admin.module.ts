import { Module } from '@nestjs/common';
import { PromosAdminController } from './promos.admin.controller';
import { PromosAdminService } from './promos.admin.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminAuthModule } from '../../admin-auth/admin-auth.module';

@Module({
  imports: [PrismaModule, AdminAuthModule],
  controllers: [PromosAdminController],
  providers: [PromosAdminService],
  exports: [PromosAdminService],
})
export class PromosAdminModule {}