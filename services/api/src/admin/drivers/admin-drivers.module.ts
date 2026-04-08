import { Module } from '@nestjs/common';
import { AdminDriversController } from './admin-drivers.controller';
import { AdminDriversService } from './admin-drivers.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [AdminDriversController],
  providers: [AdminDriversService, PrismaService],
  exports: [AdminDriversService],
})
export class AdminDriversModule {}
