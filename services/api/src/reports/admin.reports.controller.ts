// src/reports/admin.reports.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AdminKeyGuard } from '../auth/admin-key.guard';
import { OpsDashboardQueryDto } from './dto/ops-dashboard.query.dto';
import { RevenueTrendQueryDto } from './dto/revenue-trend.query.dto';

@Controller('admin/reports')
@UseGuards(AdminKeyGuard)
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('ops-dashboard')
  async opsDashboard(@Query() query: OpsDashboardQueryDto) {
    return this.reportsService.getOpsDashboard(query);
  }

  /**
   * For dropdowns in Ops UI
   * GET /api/v1/admin/reports/towns
   */
  @Get('towns')
  async towns() {
    return this.reportsService.getTownOptions();
  }

  /**
   * Revenue trend (SUCCESS payments)
   * GET /api/v1/admin/reports/revenue-trend?days=7&bucket=day
   *
   * Supports:
   * - days=7 (your current curl)
   * - OR from/to ISO strings
   */
  @Get('revenue-trend')
  async revenueTrend(@Query() query: RevenueTrendQueryDto & { days?: any }) {
    // Support `days=7` convenience
    const daysRaw = query.days;
    const days =
      daysRaw === null || daysRaw === undefined || daysRaw === ''
        ? null
        : Number(daysRaw);

    const hasFromTo = Boolean((query as any).from || (query as any).to);

    if (!hasFromTo && days && Number.isFinite(days) && days > 0) {
      const to = new Date();
      const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

      // Pass computed from/to into service
      return this.reportsService.getRevenueTrend({
        ...query,
        from: from.toISOString(),
        to: to.toISOString(),
      } as any);
    }

    return this.reportsService.getRevenueTrend(query as any);
  }
}