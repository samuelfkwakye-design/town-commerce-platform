import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { AdminReportsController } from './admin.reports.controller';

@Module({
  controllers: [ReportsController, AdminReportsController],
  providers: [PrismaService, ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}