import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { AdminRole } from '../common/auth/roles.decorator';

type JwtAdminUser = {
  sub: string;
  email: string;
  username: string;
  role: AdminRole;
  townId: string | null;
};

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listAdmins(currentAdmin: JwtAdminUser) {
    if (currentAdmin.role === AdminRole.WAREHOUSE_ADMIN) {
      throw new ForbiddenException('You do not have permission to view admin users');
    }

    const where =
      currentAdmin.role === AdminRole.GLOBAL_SUPER_ADMIN
        ? {}
        : {
            townId: currentAdmin.townId,
          };

    const rows = await this.prisma.adminUser.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        townId: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        town: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return { rows };
  }

  async getAdminById(currentAdmin: JwtAdminUser, adminUserId: string) {
    if (currentAdmin.role === AdminRole.WAREHOUSE_ADMIN) {
      throw new ForbiddenException('You do not have permission to view admin users');
    }

    const user = await this.prisma.adminUser.findUnique({
      where: { id: adminUserId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        townId: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        town: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Admin user not found');
    }

    if (currentAdmin.role === AdminRole.TOWN_SUPER_ADMIN) {
      if (
        user.role !== AdminRole.WAREHOUSE_ADMIN ||
        !currentAdmin.townId ||
        user.townId !== currentAdmin.townId
      ) {
        throw new ForbiddenException('You do not have permission to view this admin user');
      }
    }

    return user;
  }

  async createAdmin(currentAdmin: JwtAdminUser, dto: CreateAdminUserDto) {
    if (currentAdmin.role === AdminRole.WAREHOUSE_ADMIN) {
      throw new ForbiddenException('You do not have permission to create admin users');
    }

    const email = dto.email.trim().toLowerCase();
    const username = dto.username.trim().toLowerCase();
    const firstName = dto.firstName?.trim() || null;
    const lastName = dto.lastName?.trim() || null;
    const phone = dto.phone?.trim() || null;

    let role = dto.role;
    let townId = dto.townId?.trim() || null;

    if (currentAdmin.role === AdminRole.TOWN_SUPER_ADMIN) {
      if (role !== AdminRole.WAREHOUSE_ADMIN) {
        throw new ForbiddenException(
          'Town super admins can only create warehouse admins',
        );
      }

      if (!currentAdmin.townId) {
        throw new BadRequestException(
          'Your admin account is not linked to a town',
        );
      }

      townId = currentAdmin.townId;
    }

    if (currentAdmin.role === AdminRole.GLOBAL_SUPER_ADMIN) {
      if (
        role !== AdminRole.TOWN_SUPER_ADMIN &&
        role !== AdminRole.WAREHOUSE_ADMIN
      ) {
        throw new BadRequestException('Invalid role for new admin user');
      }

      if (!townId) {
        throw new BadRequestException('townId is required for this role');
      }
    }

    if (
      role === AdminRole.TOWN_SUPER_ADMIN ||
      role === AdminRole.WAREHOUSE_ADMIN
    ) {
      if (!townId) {
        throw new BadRequestException('townId is required for this role');
      }
    }

    const existingTown = townId
      ? await this.prisma.town.findUnique({
          where: { id: townId },
          select: { id: true, name: true, slug: true },
        })
      : null;

    if (townId && !existingTown) {
      throw new BadRequestException('Assigned town not found');
    }

    const existingByEmail = await this.prisma.adminUser.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingByEmail) {
      throw new BadRequestException('An admin user with this email already exists');
    }

    const existingByUsername = await this.prisma.adminUser.findUnique({
      where: { username },
      select: { id: true },
    });

    if (existingByUsername) {
      throw new BadRequestException('An admin user with this username already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const created = await this.prisma.adminUser.create({
      data: {
        email,
        username,
        passwordHash,
        firstName,
        lastName,
        phone,
        role,
        townId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        townId: true,
        isActive: true,
        createdAt: true,
        town: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return created;
  }

  async updateAdmin(
    currentAdmin: JwtAdminUser,
    adminUserId: string,
    dto: UpdateAdminUserDto,
  ) {
    if (currentAdmin.role === AdminRole.WAREHOUSE_ADMIN) {
      throw new ForbiddenException('You do not have permission to update admin users');
    }

    const existing = await this.prisma.adminUser.findUnique({
      where: { id: adminUserId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        townId: true,
        isActive: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Admin user not found');
    }

    if (currentAdmin.role === AdminRole.GLOBAL_SUPER_ADMIN) {
      if (existing.role === AdminRole.GLOBAL_SUPER_ADMIN) {
        throw new ForbiddenException('Editing global super admins is not allowed in this flow');
      }
    }

    if (currentAdmin.role === AdminRole.TOWN_SUPER_ADMIN) {
      if (
        existing.role !== AdminRole.WAREHOUSE_ADMIN ||
        !currentAdmin.townId ||
        existing.townId !== currentAdmin.townId
      ) {
        throw new ForbiddenException('You do not have permission to edit this admin user');
      }
    }

    let nextEmail =
      dto.email !== undefined ? dto.email.trim().toLowerCase() : existing.email;

    let nextUsername =
      dto.username !== undefined
        ? dto.username.trim().toLowerCase()
        : existing.username;

    let nextRole = dto.role ?? existing.role;
    let nextTownId =
      dto.townId !== undefined ? dto.townId?.trim() || null : existing.townId;

    const nextFirstName =
      dto.firstName !== undefined ? dto.firstName.trim() || null : undefined;
    const nextLastName =
      dto.lastName !== undefined ? dto.lastName.trim() || null : undefined;
    const nextPhone =
      dto.phone !== undefined ? dto.phone.trim() || null : undefined;

    if (currentAdmin.role === AdminRole.TOWN_SUPER_ADMIN) {
      nextRole = AdminRole.WAREHOUSE_ADMIN;
      nextTownId = currentAdmin.townId;
    }

    if (currentAdmin.role === AdminRole.GLOBAL_SUPER_ADMIN) {
      if (
        nextRole !== AdminRole.TOWN_SUPER_ADMIN &&
        nextRole !== AdminRole.WAREHOUSE_ADMIN
      ) {
        throw new BadRequestException('Invalid role for admin user');
      }

      if (!nextTownId) {
        throw new BadRequestException('townId is required for this role');
      }
    }

    if (
      nextRole === AdminRole.TOWN_SUPER_ADMIN ||
      nextRole === AdminRole.WAREHOUSE_ADMIN
    ) {
      if (!nextTownId) {
        throw new BadRequestException('townId is required for this role');
      }
    }

    const existingTown = nextTownId
      ? await this.prisma.town.findUnique({
          where: { id: nextTownId },
          select: { id: true },
        })
      : null;

    if (nextTownId && !existingTown) {
      throw new BadRequestException('Assigned town not found');
    }

    if (nextEmail !== existing.email) {
      const emailOwner = await this.prisma.adminUser.findUnique({
        where: { email: nextEmail },
        select: { id: true },
      });

      if (emailOwner) {
        throw new BadRequestException('An admin user with this email already exists');
      }
    }

    if (nextUsername !== existing.username) {
      const usernameOwner = await this.prisma.adminUser.findUnique({
        where: { username: nextUsername },
        select: { id: true },
      });

      if (usernameOwner) {
        throw new BadRequestException('An admin user with this username already exists');
      }
    }

    const data: Record<string, any> = {
      email: nextEmail,
      username: nextUsername,
      role: nextRole,
      townId: nextTownId,
    };

    if (nextFirstName !== undefined) data.firstName = nextFirstName;
    if (nextLastName !== undefined) data.lastName = nextLastName;
    if (nextPhone !== undefined) data.phone = nextPhone;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
      data.resetPasswordCodeHash = null;
      data.resetPasswordExpiresAt = null;
    }

    const updated = await this.prisma.adminUser.update({
      where: { id: adminUserId },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        townId: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        town: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return updated;
  }
}