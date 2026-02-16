import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersModule } from '../orders/orders.module';

import { AdminOrdersController } from './admin-orders.controller';
import { AdminOrdersService } from './admin-orders.service';

import { AdminExportsController } from './admin.exports.controller';
import { AdminExportsService } from './admin.exports.service';

import { StockInvestigationModule } from './stock-investigation/stock-investigation.module';

@Module({
  imports: [
    OrdersModule,
    StockInvestigationModule,
  ],
  controllers: [
    AdminOrdersController,
    AdminExportsController,
  ],
  providers: [
    PrismaService,
    AdminOrdersService,
    AdminExportsService,
  ],
})
export class AdminModule {}
