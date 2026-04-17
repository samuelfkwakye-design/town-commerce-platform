import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HubtelModule } from '../hubtel/hubtel.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Module({
  imports: [
    PrismaModule,
    HubtelModule,
    NotificationsModule,
    AdminAuthModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}