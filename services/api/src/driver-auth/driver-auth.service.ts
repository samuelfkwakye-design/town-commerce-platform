import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

type DriverJwtPayload = {
  sub: string;
  phone: string;
  type: 'driver';
};

@Injectable()
export class DriverAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private normalizePhone(phone: string) {
    return phone.trim();
  }

  async login(phone: string) {
    const normalizedPhone = this.normalizePhone(phone);

    const driver = await this.prisma.driver.findFirst({
      where: {
        phone: normalizedPhone,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        availability: true,
        townId: true,
      },
    });

    if (!driver) {
      throw new UnauthorizedException('Invalid driver phone');
    }

    const payload: DriverJwtPayload = {
      sub: driver.id,
      phone: driver.phone,
      type: 'driver',
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      driver,
    };
  }

  async getMe(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        name: true,
        phone: true,
        availability: true,
        townId: true,
      },
    });

    if (!driver) {
      throw new UnauthorizedException('Driver not found');
    }

    return driver;
  }

  async verifyToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<DriverJwtPayload>(token, {
        secret: process.env.JWT_SECRET || 'dev-secret-change-me',
      });

      if (payload.type !== 'driver' || !payload.sub) {
        throw new UnauthorizedException('Invalid driver token');
      }

      const driver = await this.prisma.driver.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          name: true,
          phone: true,
          availability: true,
          townId: true,
        },
      });

      if (!driver) {
        throw new UnauthorizedException('Driver not found');
      }

      return driver;
    } catch {
      throw new UnauthorizedException('Invalid or expired driver token');
    }
  }
}
