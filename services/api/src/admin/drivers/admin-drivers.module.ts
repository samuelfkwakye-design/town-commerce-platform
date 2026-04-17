import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminDriversController } from './admin-drivers.controller';
import { AdminDriversService } from './admin-drivers.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminJwtGuard } from '../../admin-auth/guards/admin-jwt.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    }),
  ],
  controllers: [AdminDriversController],
  providers: [AdminDriversService, PrismaService, AdminJwtGuard],
})
export class AdminDriversModule {}