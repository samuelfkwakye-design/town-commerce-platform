import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TownProductsController } from './town-products.controller';
import { TownProductsService } from './town-products.service';

@Module({
  imports: [PrismaModule],
  controllers: [TownProductsController],
  providers: [TownProductsService],
})
export class TownProductsModule {}
