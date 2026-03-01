import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersModule } from '../orders/orders.module';
import { ReportsModule } from '../reports/reports.module';

import { AdminOrdersController } from './admin-orders.controller';
import { AdminOrdersService } from './admin-orders.service';
import { AdminTownProductsController } from './admin.town-products.controller';
import { AdminExportsController } from './admin.exports.controller';
import { AdminExportsService } from './admin.exports.service';

// ✅ existing
import { AdminRefundsModule } from './refunds/admin.refunds.module';

// ✅ NEW: product images admin endpoints
import { AdminProductImagesModule } from './product-images/admin.product-images.module';

@Module({
  imports: [
    OrdersModule,
    ReportsModule,
    AdminRefundsModule,
    AdminProductImagesModule, // ✅ added
  ],
  controllers: [
    AdminOrdersController,
    AdminExportsController,
    AdminTownProductsController,
  ],
  providers: [
    PrismaService,
    AdminOrdersService,
    AdminExportsService,
  ],
})
export class AdminModule {}