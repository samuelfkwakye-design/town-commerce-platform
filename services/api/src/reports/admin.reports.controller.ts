// src/reports/admin.reports.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles, AdminRole } from '../common/auth/roles.decorator';
import { OpsDashboardQueryDto } from './dto/ops-dashboard.query.dto';
import { RevenueTrendQueryDto } from './dto/revenue-trend.query.dto';

@Controller('admin/reports')
@UseGuards(AdminJwtGuard, RolesGuard)
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('ops-dashboard')
  @Roles(
    AdminRole.GLOBAL_SUPER_ADMIN,
    AdminRole.TOWN_SUPER_ADMIN,
    AdminRole.WAREHOUSE_ADMIN,
  )
  async opsDashboard(@Query() query: OpsDashboardQueryDto) {
    return this.reportsService.getOpsDashboard(query);
  }

  @Get('towns')
  @Roles(AdminRole.GLOBAL_SUPER_ADMIN)
  async towns() {
    return this.reportsService.getTownOptions();
  }

  @Get('revenue-trend')
  @Roles(
    AdminRole.GLOBAL_SUPER_ADMIN,
    AdminRole.TOWN_SUPER_ADMIN,
    AdminRole.WAREHOUSE_ADMIN,
  )
  async revenueTrend(@Query() query: RevenueTrendQueryDto & { days?: any }) {
    const daysRaw = query.days;
    const days =
      daysRaw === null || daysRaw === undefined || daysRaw === ''
        ? null
        : Number(daysRaw);

    const hasFromTo = Boolean((query as any).from || (query as any).to);

    if (!hasFromTo && days && Number.isFinite(days) && days > 0) {
      const to = new Date();
      const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

      return this.reportsService.getRevenueTrend({
        ...query,
        from: from.toISOString(),
        to: to.toISOString(),
      } as any);
    }

    return this.reportsService.getRevenueTrend(query as any);
  }
}