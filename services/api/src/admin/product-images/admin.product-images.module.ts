import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminProductImagesController } from './admin.product-images.controller';
import { AdminProductImagesService } from './admin.product-images.service';
import { AdminAuthModule } from '../../admin-auth/admin-auth.module';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminProductImagesController],
  providers: [PrismaService, AdminProductImagesService],
})
export class AdminProductImagesModule {}