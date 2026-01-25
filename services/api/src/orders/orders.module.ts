import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HubtelModule } from '../hubtel/hubtel.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    PrismaModule,
    HubtelModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
