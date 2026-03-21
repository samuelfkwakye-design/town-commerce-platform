import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { CustomerAuthController } from './customer-auth.controller';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerJwtStrategy } from './customer-jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret:
        process.env.CUSTOMER_JWT_SECRET || 'dev_customer_jwt_secret_change_me',
     signOptions: {
  expiresIn: (process.env.CUSTOMER_JWT_EXPIRES_IN || '30d') as any,
},
    }),
  ],
  controllers: [CustomerAuthController],
  providers: [CustomerAuthService, CustomerJwtStrategy],
  exports: [CustomerAuthService, PassportModule, JwtModule],
})
export class CustomerAuthModule {}
