import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { RequestAdminPasswordResetDto } from './dto/request-admin-password-reset.dto';
import { ResetAdminPasswordDto } from './dto/reset-admin-password.dto';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: AdminLoginDto) {
    const user = await this.prisma.adminUser.findFirst({
      where: {
        OR: [{ email: dto.login }, { username: dto.login }],
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordOk) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async me(adminUser: { sub: string }) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id: adminUser.sub },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Admin user not found');
    }

    return user;
  }

  async requestPasswordReset(dto: RequestAdminPasswordResetDto) {
    const user = await this.prisma.adminUser.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      return { ok: true };
    }

    const rawCode = crypto.randomInt(100000, 999999).toString();
    const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: {
        resetPasswordCodeHash: codeHash,
        resetPasswordExpiresAt: expiresAt,
      },
    });

    return {
      ok: true,
      ...(process.env.NODE_ENV !== 'production'
        ? { devResetCode: rawCode }
        : {}),
    };
  }

  async resetPassword(dto: ResetAdminPasswordDto) {
    const codeHash = crypto.createHash('sha256').update(dto.code).digest('hex');

    const user = await this.prisma.adminUser.findFirst({
      where: {
        resetPasswordCodeHash: codeHash,
        resetPasswordExpiresAt: { gt: new Date() },
        isActive: true,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordCodeHash: null,
        resetPasswordExpiresAt: null,
      },
    });

    return { ok: true };
  }
}
