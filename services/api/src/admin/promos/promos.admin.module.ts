import { Module } from '@nestjs/common';
import { PromosAdminController } from './promos.admin.controller';
import { PromosAdminService } from './promos.admin.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PromosAdminController],
  providers: [PromosAdminService],
  exports: [PromosAdminService],
})
export class PromosAdminModule {}
