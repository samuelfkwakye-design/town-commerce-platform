import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DriverAuthController } from './driver-auth.controller';
import { DriverAuthService } from './driver-auth.service';
import { DriverJwtGuard } from './guards/driver-jwt.guard';
import { PrismaService } from '../prisma/prisma.service';
import { DriverController } from '../driver/driver.controller';
import { DriverService } from '../driver/driver.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-change-me',
      signOptions: { expiresIn: '30d' },
    }),
  ],
  controllers: [DriverAuthController, DriverController],
  providers: [DriverAuthService, DriverJwtGuard, DriverService, PrismaService],
  exports: [DriverAuthService, DriverJwtGuard],
})
export class DriverAuthModule {}