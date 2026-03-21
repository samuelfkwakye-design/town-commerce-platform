import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HubtelModule } from '../hubtel/hubtel.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [PrismaModule, HubtelModule, NotificationsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}