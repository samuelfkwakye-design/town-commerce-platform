import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminCodController } from './admin-cod.controller';
import { AdminCodService } from './admin-cod.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminCodController],
  providers: [AdminCodService],
})
export class AdminCodModule {}
