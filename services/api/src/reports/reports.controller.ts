import { Body, Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AdminKeyGuard } from '../auth/admin-key.guard';
import { ReportsService } from './reports.service';
import { StockValuationQueryDto } from './dto/stock-valuation.query.dto';
import { SetCostDto } from './dto/set-cost.dto';
import { ProfitReportQueryDto } from './dto/profit-report.query.dto';
import { SalesProfitQueryDto } from './dto/sales-profit.query.dto';
import { SalesTimeseriesQueryDto } from './dto/sales-timeseries.query.dto';
import { SalesSummaryQueryDto } from './dto/sales-summary.query.dto';
import { TopProductsQueryDto } from './dto/top-products.query.dto';
import { TownLeaderboardQueryDto } from './dto/town-leaderboard.query.dto';
import { NetProfitQueryDto } from './dto/net-profit.query.dto';
import { RefundLeaderboardQueryDto } from './dto/refund-leaderboard.query.dto';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { RolesGuard } from '../common/auth/roles.guard';

@UseGuards(AdminJwtGuard, RolesGuard)
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
// GET /api/v1/reports/top-products
@Get('top-products')
topProducts(@Query() q: TopProductsQueryDto) {
  return this.service.topProducts(q);
}

  // GET /api/v1/reports/profit
  @Get('profit')
  profit(@Query() q: ProfitReportQueryDto) {
    return this.service.getProfitReport(q);
  }

  // GET /api/v1/reports/profit.csv
  @Get('profit.csv')
  async profitCsv(@Query() q: ProfitReportQueryDto, @Res() res: Response) {
    const csv = await this.service.profitCsv(q);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="profit-report.csv"');
    res.send(csv);
  }
// GET /api/v1/reports/sales-profit.csv
@Get('sales-profit.csv')
async salesProfitCsv(@Query() q: SalesProfitQueryDto, @Res() res: Response) {
  const csv = await this.service.salesProfitCsv(q);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="sales-profit-report.csv"');
  res.send(csv);
}

  // GET /api/v1/reports/stock-valuation.csv
  @Get('stock-valuation.csv')
  async stockValuationCsv(@Query() q: StockValuationQueryDto, @Res() res: Response) {
    const csv = await this.service.stockValuationCsv(q);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="stock-valuation.csv"');
    res.send(csv);
  }
  // GET /api/v1/reports/sales-profit
@Get('sales-profit')
salesProfit(@Query() q: SalesProfitQueryDto) {
  return this.service.salesProfitReport(q);
}
// GET /api/v1/reports/sales-summary
@Get('sales-summary')
salesSummary(@Query() q: SalesSummaryQueryDto) {
  return this.service.salesSummary(q);
}
// GET /api/v1/reports/top-products.csv
@Get('top-products.csv')
async topProductsCsv(@Query() q: TopProductsQueryDto, @Res() res: Response) {
  const csv = await this.service.topProductsCsv(q);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="top-products.csv"');
  res.send(csv);
}
// GET /api/v1/reports/town-leaderboard
@Get('town-leaderboard')
townLeaderboard(@Query() q: TownLeaderboardQueryDto) {
  return this.service.townLeaderboard(q);
}
// GET /api/v1/reports/net-profit
@Get('net-profit')
netProfit(@Query() q: NetProfitQueryDto) {
  return this.service.netProfit(q);
}

// GET /api/v1/reports/net-profit-timeseries
@Get('net-profit-timeseries')
netProfitTimeseries(@Query() q: NetProfitQueryDto) {
  return this.service.netProfitTimeseries(q);
}

// GET /api/v1/reports/town-leaderboard.csv
@Get('town-leaderboard.csv')
async townLeaderboardCsv(@Query() q: TownLeaderboardQueryDto, @Res() res: Response) {
  const csv = await this.service.townLeaderboardCsv(q);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="town-leaderboard.csv"');
  res.send(csv);
}
// GET /api/v1/reports/refund-leaderboard
@Get('refund-leaderboard')
refundLeaderboard(@Query() q: RefundLeaderboardQueryDto) {
  return this.service.refundLeaderboard(q);
}

// GET /api/v1/reports/refund-leaderboard.csv
@Get('refund-leaderboard.csv')
async refundLeaderboardCsv(@Query() q: RefundLeaderboardQueryDto, @Res() res: Response) {
  const csv = await this.service.refundLeaderboardCsv(q);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="refund-leaderboard.csv"');
  res.send(csv);
}

// GET /api/v1/reports/sales-timeseries
@Get('sales-timeseries')
salesTimeseries(@Query() q: SalesTimeseriesQueryDto) {
  return this.service.salesTimeseries(q);
}

}
