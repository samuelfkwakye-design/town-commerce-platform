import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminRole } from '../common/auth/roles.decorator';

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

  private getEffectiveTownId(requestedTownId: string | undefined, admin: CurrentAdminUser) {
    if (this.isGlobal(admin)) return requestedTownId;
    this.assertTownAccess(admin);
    return admin.townId!;
  }

  async list(townId: string | undefined, admin: CurrentAdminUser) {
    const effectiveTownId = this.getEffectiveTownId(townId, admin);

    return this.prisma.driver.findMany({
      where: effectiveTownId ? { townId: effectiveTownId } : {},
      orderBy: [
        { availability: 'asc' },
        { priority: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        town: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async get(id: string, admin: CurrentAdminUser) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      include: {
        town: true,
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

  async create(data: any, admin: CurrentAdminUser) {
    const effectiveTownId = this.getEffectiveTownId(data.townId, admin);

    if (!effectiveTownId) {
      throw new BadRequestException('townId is required');
    }

    return this.prisma.driver.create({
      data: {
        name: data.name,
        phone: data.phone,
        townId: effectiveTownId,
        availability: 'AVAILABLE',
        priority: data.priority ?? 100,
      },
    });
  }

  async update(id: string, data: any, admin: CurrentAdminUser) {
    const existing = await this.get(id, admin);

    return this.prisma.driver.update({
      where: { id },
      data: {
        name: data.name ?? existing.name,
        phone: data.phone ?? existing.phone,
        availability: data.availability ?? existing.availability,
        priority: data.priority ?? existing.priority,
        isActive: data.isActive ?? existing.isActive,
      },
    });
  }

  async delete(id: string, admin: CurrentAdminUser) {
    await this.get(id, admin);

    return this.prisma.driver.delete({
      where: { id },
    });
  }
}
