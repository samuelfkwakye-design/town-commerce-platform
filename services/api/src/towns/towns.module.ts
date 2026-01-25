import { Module } from '@nestjs/common';
import { TownsController } from './towns.controller';
import { TownsService } from './towns.service';

@Module({
  controllers: [TownsController],
  providers: [TownsService],
})
export class TownsModule {}
