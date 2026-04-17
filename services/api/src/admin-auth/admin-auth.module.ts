import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminJwtGuard } from './guards/admin-jwt.guard';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    }),
    NotificationsModule,
  ],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, PrismaService, AdminJwtGuard],
  exports: [AdminJwtGuard, JwtModule],
})
export class AdminAuthModule {}