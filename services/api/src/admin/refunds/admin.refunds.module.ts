import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminRefundsController } from './admin.refunds.controller';
import { AdminRefundsService } from './admin.refunds.service';

@Module({
  controllers: [AdminRefundsController],
  providers: [PrismaService, AdminRefundsService],
})
export class AdminRefundsModule {}
