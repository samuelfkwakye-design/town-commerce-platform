import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminRole } from '../../common/auth/roles.decorator';

type CurrentAdminUser = {
  sub: string;
  role: AdminRole;
  townId?: string | null;
};

@Injectable()
export class AdminDriversService {
  constructor(private readonly prisma: PrismaService) {}

  private isGlobal(admin: CurrentAdminUser) {
    return admin.role === AdminRole.GLOBAL_SUPER_ADMIN;
  }

  private isTownScoped(admin: CurrentAdminUser) {
    return (
      admin.role === AdminRole.TOWN_SUPER_ADMIN ||
      admin.role === AdminRole.WAREHOUSE_ADMIN
    );
  }

  private assertTownAccess(admin: CurrentAdminUser) {
    if (this.isTownScoped(admin) && !admin.townId) {
      throw new ForbiddenException('Admin has no town assigned');
    }
  }

  private getEffectiveTownId(
    requestedTownId: string | undefined,
    admin: CurrentAdminUser,
  ) {
    if (this.isGlobal(admin)) return requestedTownId;
    this.assertTownAccess(admin);
    return admin.townId!;
  }

  async list(townId: string | undefined, admin: CurrentAdminUser) {
    const effectiveTownId = this.getEffectiveTownId(townId, admin);

    return this.prisma.driver.findMany({
  where: {
    ...(effectiveTownId ? { townId: effectiveTownId } : {}),
    deletedAt: null,
  },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      include: {
        town: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async get(id: string, admin: CurrentAdminUser) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      include: {
        town: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (!this.isGlobal(admin) && driver.townId !== admin.townId) {
      throw new ForbiddenException('Access denied to this driver');
    }

    return driver;
  }
  async getOrders(id: string, admin: CurrentAdminUser) {
    await this.get(id, admin);

    return this.prisma.order.findMany({
      where: {
        driverId: id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        status: true,
        total: true,
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
  }
  async create(
    data: {
      name: string;
      phone: string;
      townId?: string;
      priority?: number;
    },
    admin: CurrentAdminUser,
  ) {
    const effectiveTownId = this.getEffectiveTownId(data.townId, admin);

    if (!effectiveTownId) {
      throw new BadRequestException('townId is required');
    }

    if (!data.name?.trim()) {
      throw new BadRequestException('name is required');
    }

    if (!data.phone?.trim()) {
      throw new BadRequestException('phone is required');
    }

    return this.prisma.driver.create({
      data: {
        name: data.name.trim(),
        phone: data.phone.trim(),
        townId: effectiveTownId,
        availability: 'AVAILABLE',
        priority: Number.isFinite(Number(data.priority))
          ? Number(data.priority)
          : 100,
      },
      include: {
        town: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      phone?: string;
      availability?: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
      priority?: number;
      isActive?: boolean;
    },
    admin: CurrentAdminUser,
  ) {
    const existing = await this.get(id, admin);

    return this.prisma.driver.update({
      where: { id },
      data: {
        name: data.name?.trim() ?? existing.name,
        phone: data.phone?.trim() ?? existing.phone,
        availability: data.availability ?? existing.availability,
        priority:
          data.priority != null ? Number(data.priority) : existing.priority,
        isActive:
          typeof data.isActive === 'boolean'
            ? data.isActive
            : existing.isActive,
      },
      include: {
        town: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async remove(id: string, admin: CurrentAdminUser) {
    await this.get(id, admin);

    return this.prisma.driver.update({
  where: { id },
  data: {
    deletedAt: new Date(),
  },
});
  }
}