import { Module } from '@nestjs/common';
import { PromosService } from './promos.service';
import { PromosController } from './promos.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [PromosService, PrismaService],
  controllers: [PromosController],
})
export class PromosModule {}