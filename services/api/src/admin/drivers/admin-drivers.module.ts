import { Module } from '@nestjs/common';
import { AdminDriversController } from './admin-drivers.controller';
import { AdminDriversService } from './admin-drivers.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAuthModule } from '../../admin-auth/admin-auth.module';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminDriversController],
  providers: [AdminDriversService, PrismaService],
})
export class AdminDriversModule {}