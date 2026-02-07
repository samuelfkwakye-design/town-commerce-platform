import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AdminKeyGuard } from '../auth/admin-key.guard';
import { ReportsService } from './reports.service';
import { StockValuationQueryDto } from './dto/stock-valuation.query.dto';
import { SetCostDto } from './dto/set-cost.dto';
import { ProfitReportQueryDto } from './dto/profit-report.query.dto';

@UseGuards(AdminKeyGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  // GET /api/v1/reports/stock-valuation
  @Get('stock-valuation')
  stockValuation(@Query() q: StockValuationQueryDto) {
    return this.service.stockValuation(q);
  }

  // POST /api/v1/reports/set-cost
  @Post('set-cost')
  setCost(@Body() dto: SetCostDto) {
    return this.service.setCost(dto);
  }

  // GET /api/v1/reports/profit
  @Get('profit')
  profit(@Query() q: ProfitReportQueryDto) {
    return this.service.getProfitReport(q);
  }
}
