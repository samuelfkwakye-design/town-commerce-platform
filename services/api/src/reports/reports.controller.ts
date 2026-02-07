import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminKeyGuard } from '../auth/admin-key.guard';
import { ReportsService } from './reports.service';
import { StockValuationQueryDto } from './dto/stock-valuation.query.dto';

@UseGuards(AdminKeyGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  // GET /api/v1/reports/stock-valuation
  @Get('stock-valuation')
  stockValuation(@Query() q: StockValuationQueryDto) {
    return this.service.stockValuation(q);
  }
}
