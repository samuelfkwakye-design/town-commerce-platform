import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AdminKeyGuard } from '../auth/admin-key.guard';
import { ReportsService } from './reports.service';
import { StockValuationQueryDto } from './dto/stock-valuation.query.dto';
import { SetCostDto } from './dto/set-cost.dto';


@UseGuards(AdminKeyGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  // GET /api/v1/reports/stock-valuation
  @Get('stock-valuation')
  stockValuation(@Query() q: StockValuationQueryDto) {
    return this.service.stockValuation(q);
  }
    @UseGuards(AdminKeyGuard)
  @Post('set-cost')
  setCost(@Body() dto: SetCostDto) {
    return this.service.setCost(dto);
  }

}
