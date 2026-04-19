import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Module({
  imports: [AdminAuthModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class TownProductsModule {}