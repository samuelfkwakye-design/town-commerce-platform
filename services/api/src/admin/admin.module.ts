import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersModule } from '../orders/orders.module';
import { ReportsModule } from '../reports/reports.module';

import { AdminOrdersController } from './admin-orders.controller';
import { AdminOrdersService } from './admin-orders.service';
import { AdminExportsController } from './admin.exports.controller';
import { AdminExportsService } from './admin.exports.service';
import { AdminTownProductsService } from '../town-products/admin.town-products.service';
import { AdminTownsController } from './admin.towns.controller';

// ✅ existing
import { AdminRefundsModule } from './refunds/admin.refunds.module';

// ✅ product images admin endpoints
import { AdminProductImagesModule } from './product-images/admin.product-images.module';

// ✅ IMPORTANT: use the controller from town-products (this is the one that was serving /admin/town-products)
import { AdminTownProductsController } from '../town-products/admin.town-products.controller';

// ✅ variants controller
import { AdminTownProductVariantsController } from '../town-products/admin.town-product-variants.controller';

@Module({
  imports: [
    OrdersModule,
    ReportsModule,
    AdminRefundsModule,
    AdminProductImagesModule,
  ],
  controllers: [
    AdminOrdersController,
    AdminExportsController,

    // ✅ serve /api/v1/admin/town-products from here now
    AdminTownProductsController,

    // ✅ serve /api/v1/admin/town-products/:id/variants
    AdminTownProductVariantsController,

    AdminTownsController,
  ],
  providers: [
    PrismaService,
    AdminOrdersService,
    AdminExportsService,
    AdminTownProductsService,
  ],
})
export class AdminModule {}