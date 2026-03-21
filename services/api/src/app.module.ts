import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CatalogModule } from './catalog/catalog.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { TownsModule } from './towns/towns.module';
import { ProductsModule } from './products/products.module';
import { TownProductsModule } from './town-products/town-products.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { StockMovementsModule } from './stock-movements/stock-movements.module';
import { ReportsModule } from './reports/reports.module';
import { AdminModule } from './admin/admin.module';
import { UploadsModule } from './uploads/uploads.module';
import { CustomerAuthModule } from './customer-auth/customer-auth.module';
import { CustomersModule } from './customers/customers.module';
import { TownSettingsModule } from './town-settings/town-settings.module';
import { PromosModule } from './promos/promos.module';
import { PromosAdminModule } from './admin/promos/promos.admin.module';
import { AdminCustomersModule } from './admin/customers/admin-customers.module';
@Module({
  imports: [
    HealthModule,
    PrismaModule,
    TownsModule,
    ProductsModule,
    TownProductsModule,
    OrdersModule,
    StockMovementsModule,
    ReportsModule,
    PaymentsModule, // 👈 REQUIRED for webhook to be live
    AdminModule,    // 👈 ADD THIS LINE
    CatalogModule,
    UploadsModule,
    CustomerAuthModule,
    CustomersModule,
    TownSettingsModule,
    PromosModule,
    PromosAdminModule,
    AdminCustomersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
