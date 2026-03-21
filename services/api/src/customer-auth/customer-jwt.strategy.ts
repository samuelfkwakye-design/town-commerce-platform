import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

function cookieExtractor(req: any): string | null {
  const cookieName = process.env.CUSTOMER_AUTH_COOKIE_NAME || 'tc_customer_token';
  if (!req?.cookies) return null;
  return req.cookies[cookieName] ?? null;
}

@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(
  Strategy,
  'customer-jwt',
) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      ignoreExpiration: false,
      secretOrKey:
        process.env.CUSTOMER_JWT_SECRET || 'dev_customer_jwt_secret_change_me',
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!customer || !customer.isActive) {
      throw new UnauthorizedException('Customer account not found or inactive');
    }

    return customer;
  }
}
