import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@Injectable()
export class AdminDriversService {
  constructor(private readonly prisma: PrismaService) {}

  async listByTown(townId: string, includeInactive = true) {
    if (!townId) {
      throw new BadRequestException('townId is required');
    }

    return this.prisma.driver.findMany({
      where: {
        townId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ priority: 'asc' }, { lastAssignedAt: 'asc' }],
      include: {
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

  async getById(id: string) {
    if (!id) {
      throw new BadRequestException('id is required');
    }

    const driver = await this.prisma.driver.findUnique({
      where: { id },
      include: {
        town: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver;
  }

  async getOrders(driverId: string) {
    await this.ensureDriverExists(driverId);

    return this.prisma.order.findMany({
      where: {
        driverId,
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
      take: 50,
    });
  }

  async create(dto: CreateDriverDto) {
    const town = await this.prisma.town.findUnique({
      where: { id: dto.townId },
      select: { id: true },
    });

    if (!town) {
      throw new NotFoundException('Town not found');
    }

    return this.prisma.driver.create({
      data: {
        townId: dto.townId,
        name: dto.name.trim(),
        phone: dto.phone.trim(),
        priority: dto.priority ?? 100,
        availability: dto.availability ?? 'AVAILABLE',
        isActive: dto.isActive ?? true,
      },
      include: {
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

  async update(id: string, dto: UpdateDriverDto) {
    await this.ensureDriverExists(id);

    return this.prisma.driver.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.availability !== undefined
          ? { availability: dto.availability }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: {
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

  async setAvailability(
    id: string,
    availability: 'AVAILABLE' | 'BUSY' | 'OFFLINE',
  ) {
    await this.ensureDriverExists(id);

    return this.prisma.driver.update({
      where: { id },
      data: { availability },
      include: {
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

  async setActive(id: string, isActive: boolean) {
    await this.ensureDriverExists(id);

    return this.prisma.driver.update({
      where: { id },
      data: { isActive },
      include: {
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

  private async ensureDriverExists(id: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver;
  }
}