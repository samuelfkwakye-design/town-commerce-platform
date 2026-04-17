import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersModule } from '../orders/orders.module';
import { ReportsModule } from '../reports/reports.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { AdminOrdersController } from './admin-orders.controller';
import { AdminOrdersService } from './admin-orders.service';
import { AdminExportsController } from './admin.exports.controller';
import { AdminExportsService } from './admin.exports.service';
import { AdminTownProductsService } from '../town-products/admin.town-products.service';
import { AdminTownsController } from './admin.towns.controller';

import { AdminRefundsModule } from './refunds/admin.refunds.module';
import { AdminProductImagesModule } from './product-images/admin.product-images.module';
import { AdminTownProductsController } from '../town-products/admin.town-products.controller';
import { AdminTownProductVariantsController } from '../town-products/admin.town-product-variants.controller';
import { AdminDriversModule } from './drivers/admin-drivers.module';

import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

@Module({
  imports: [
    OrdersModule,
    ReportsModule,
    NotificationsModule,
    AdminRefundsModule,
    AdminProductImagesModule,
    AdminDriversModule,
    AdminAuthModule,
  ],
  controllers: [
    AdminOrdersController,
    AdminExportsController,
    AdminTownProductsController,
    AdminTownProductVariantsController,
    AdminTownsController,
    AdminUsersController,
  ],
  providers: [
    PrismaService,
    AdminOrdersService,
    AdminExportsService,
    AdminTownProductsService,
    AdminUsersService,
  ],
})
export class AdminModule {}