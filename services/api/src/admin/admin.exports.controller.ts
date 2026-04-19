import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AdminExportsService } from './admin.exports.service';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { RolesGuard } from '../common/auth/roles.guard';

@Controller('admin/exports')
@UseGuards(AdminJwtGuard, RolesGuard)
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