import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StockInvestigationController } from './stock-investigation.controller';
import { StockInvestigationDevController } from './stock-investigation.dev.controller';
import { StockInvestigationService } from './stock-investigation.service';

@Module({
  controllers: [StockInvestigationController, StockInvestigationDevController],
  providers: [PrismaService, StockInvestigationService],
})
export class StockInvestigationModule {}
