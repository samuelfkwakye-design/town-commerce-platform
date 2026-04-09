import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.ADMIN_JWT_SECRET || 'dev_admin_secret_change_me',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AdminAuthController],
  providers: [PrismaService, AdminAuthService, RolesGuard],
  exports: [JwtModule, AdminAuthService, RolesGuard],
})
export class AdminAuthModule {}
