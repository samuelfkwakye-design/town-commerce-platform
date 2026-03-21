import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import * as crypto from 'crypto';
type SafeCustomer = {
  id: string;
  phone: string;
  email: string | null;
  firstName: string;
  lastName: string | null;
  isActive: boolean;
  defaultTownId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private getCookieName() {
    return process.env.CUSTOMER_AUTH_COOKIE_NAME || 'tc_customer_token';
  }

  private getCookieOptions() {
    const isProd = process.env.NODE_ENV === 'production';

    return {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? ('none' as const) : ('lax' as const),
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 30,
    };
  }
  private generateResetCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private hashResetCode(code: string) {
    return crypto.createHash('sha256').update(code).digest('hex');
  }
  private normalizePhone(phone: string) {
    const raw = String(phone ?? '').trim().replace(/[\s\-()]/g, '');

    if (!raw) {
      throw new BadRequestException('Phone number is required');
    }

    if (raw.startsWith('+233')) {
      return `+233${raw.slice(4)}`;
    }

    if (raw.startsWith('233')) {
      return `+${raw}`;
    }

    if (raw.startsWith('0')) {
      return `+233${raw.slice(1)}`;
    }

    if (raw.startsWith('+')) {
      return raw;
    }

    return `+233${raw}`;
  }

  private toSafeCustomer(customer: SafeCustomer) {
    return {
      id: customer.id,
      phone: customer.phone,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      isActive: customer.isActive,
      defaultTownId: customer.defaultTownId,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }

  private async signCustomerToken(customer: { id: string; phone: string }) {
    return this.jwtService.signAsync({
      sub: customer.id,
      phone: customer.phone,
    });
  }

  async register(dto: RegisterCustomerDto, res: Response) {
    const phone = this.normalizePhone(dto.phone);
    const email = dto.email?.trim().toLowerCase() || null;
    const defaultTownId = dto.defaultTownId?.trim() || null;

    const existingPhone = await this.prisma.customer.findUnique({
      where: { phone },
      select: { id: true },
    });

    if (existingPhone) {
      throw new BadRequestException(
        'An account already exists for this phone number',
      );
    }

    if (email) {
      const existingEmail = await this.prisma.customer.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingEmail) {
        throw new BadRequestException(
          'An account already exists for this email',
        );
      }
    }

    if (defaultTownId) {
      const town = await this.prisma.town.findUnique({
        where: { id: defaultTownId },
        select: { id: true, isActive: true },
      });

      if (!town || town.isActive === false) {
        throw new BadRequestException('Selected default town is invalid');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const customer = await this.prisma.customer.create({
      data: {
        phone,
        email,
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName?.trim() || null,
        defaultTownId,
      },
      select: {
        id: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        defaultTownId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const safeCustomer: SafeCustomer = {
      id: customer.id,
      phone: customer.phone,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      isActive: customer.isActive,
      defaultTownId: customer.defaultTownId,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };

    const token = await this.signCustomerToken({
      id: safeCustomer.id,
      phone: safeCustomer.phone,
    });

    res.cookie(this.getCookieName(), token, this.getCookieOptions());

    return {
      ok: true,
      customer: this.toSafeCustomer(safeCustomer),
    };
  }

  async login(dto: LoginCustomerDto, res: Response) {
    const phone = this.normalizePhone(dto.phone);

    const customer = await this.prisma.customer.findUnique({
      where: { phone },
      select: {
        id: true,
        phone: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        isActive: true,
        defaultTownId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!customer || !customer.isActive) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    const ok = await bcrypt.compare(dto.password, customer.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    const safeCustomer: SafeCustomer = {
      id: customer.id,
      phone: customer.phone,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      isActive: customer.isActive,
      defaultTownId: customer.defaultTownId,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };

    const token = await this.signCustomerToken({
      id: safeCustomer.id,
      phone: safeCustomer.phone,
    });

    res.cookie(this.getCookieName(), token, this.getCookieOptions());

    return {
      ok: true,
      customer: this.toSafeCustomer(safeCustomer),
    };
  }

  async logout(res: Response) {
    res.clearCookie(this.getCookieName(), {
      path: '/',
    });

    return { ok: true };
  }

    async requestPasswordReset(phoneRaw: string) {
    const phone = this.normalizePhone(phoneRaw);

    const customer = await this.prisma.customer.findUnique({
      where: { phone },
      select: {
        id: true,
        phone: true,
        isActive: true,
      },
    });

    // Always return success-style response to avoid account enumeration
    if (!customer || !customer.isActive) {
      return {
        ok: true,
        message: 'If an account exists for this phone number, a reset code has been sent.',
      };
    }

    const code = this.generateResetCode();
    const codeHash = this.hashResetCode(code);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await this.prisma.$transaction(async (tx) => {
      await tx.customerPasswordReset.updateMany({
        where: {
          customerId: customer.id,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });

      await tx.customerPasswordReset.create({
        data: {
          customerId: customer.id,
          codeHash,
          expiresAt,
        },
      });
    });

    const isProd = process.env.NODE_ENV === 'production';

    return {
      ok: true,
      message: 'If an account exists for this phone number, a reset code has been sent.',
      ...(isProd
        ? {}
        : {
            devResetCode: code,
            expiresAt,
          }),
    };
  }

  async resetPassword(phoneRaw: string, codeRaw: string, newPassword: string) {
    const phone = this.normalizePhone(phoneRaw);
    const code = String(codeRaw ?? '').trim();

    const customer = await this.prisma.customer.findUnique({
      where: { phone },
      select: {
        id: true,
        phone: true,
        isActive: true,
      },
    });

    if (!customer || !customer.isActive) {
      throw new UnauthorizedException('Invalid reset request');
    }

    const resetRow = await this.prisma.customerPasswordReset.findFirst({
      where: {
        customerId: customer.id,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!resetRow) {
      throw new BadRequestException('Reset code not found. Please request a new one.');
    }

    if (resetRow.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Reset code has expired. Please request a new one.');
    }

    const incomingHash = this.hashResetCode(code);

    if (incomingHash !== resetRow.codeHash) {
      throw new BadRequestException('Invalid reset code');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id: customer.id },
        data: { passwordHash },
      });

      await tx.customerPasswordReset.update({
        where: { id: resetRow.id },
        data: { usedAt: new Date() },
      });
    });

    return {
      ok: true,
      message: 'Password reset successful. You can now log in.',
    };
  }
 async getCustomer(customerId: string) {
  const customer = await this.prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      defaultTown: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!customer) return null;

  return {
    id: customer.id,
    phone: customer.phone,
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    isActive: customer.isActive,
    defaultTownId: customer.defaultTownId,
    defaultTown: customer.defaultTown,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}
}