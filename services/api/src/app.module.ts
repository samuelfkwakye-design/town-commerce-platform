import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { TownsModule } from './towns/towns.module';
import { ProductsModule } from './products/products.module';
import { TownProductsModule } from './town-products/town-products.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { StockMovementsModule } from './stock-movements/stock-movements.module';

@Module({
  imports: [
    HealthModule,
    PrismaModule,
    TownsModule,
    ProductsModule,
    TownProductsModule,
    OrdersModule,
    StockMovementsModule,
    PaymentsModule, // 👈 REQUIRED for webhook to be live
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
