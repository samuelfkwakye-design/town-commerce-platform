import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AdminKeyGuard } from '../auth/admin-key.guard';
import { AdminExportsService } from './admin.exports.service';

@Controller('admin/exports')
@UseGuards(AdminKeyGuard)
export class AdminExportsController {
  constructor(private readonly exportsService: AdminExportsService) {}

  @Get('orders.csv')
  async exportOrders(@Query() q: any, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
    await this.exportsService.streamOrdersCsv(q, res);
  }

  @Get('refunds.csv')
  async exportRefunds(@Query() q: any, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="refunds.csv"');
    await this.exportsService.streamRefundsCsv(q, res);
  }

  // ✅ Phase 3: Net Profit Timeseries CSV
  // GET /api/v1/admin/exports/net-profit-timeseries.csv?bucket=day|week|month&townId=&from=&to=&adminKey=...
  @Get('net-profit-timeseries.csv')
  async exportNetProfitTimeseries(@Query() q: any, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="net-profit-timeseries_${q.bucket || 'day'}.csv"`,
    );

    await this.exportsService.streamNetProfitTimeseriesCsv(q, res);
  }
}
