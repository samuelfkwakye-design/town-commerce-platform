import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StockInvestigationController } from './stock-investigation.controller';
import { StockInvestigationService } from './stock-investigation.service';

@Module({
  controllers: [StockInvestigationController],
  providers: [StockInvestigationService, PrismaService],
})
export class StockInvestigationModule {}
