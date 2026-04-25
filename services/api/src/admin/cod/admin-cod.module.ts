import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminAuthModule } from '../../admin-auth/admin-auth.module';
import { AdminCodController } from './admin-cod.controller';
import { AdminCodService } from './admin-cod.service';

@Module({
  imports: [PrismaModule, AdminAuthModule],
  controllers: [AdminCodController],
  providers: [AdminCodService],
})
export class AdminCodModule {}