import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Injectable()
export class TownsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.town.findMany({
      orderBy: { name: 'asc' },
      include: { warehouse: true },
    });
  }

  async create(name: string) {
    const trimmed = (name ?? '').trim();
    if (!trimmed) throw new BadRequestException('Town name is required');

    const slug = slugify(trimmed);
    if (!slug) throw new BadRequestException('Invalid town name');

    // Create town + its single warehouse atomically
    return this.prisma.$transaction(async (tx) => {
      const town = await tx.town.create({
        data: { name: trimmed, slug },
      });

      const warehouse = await tx.warehouse.create({
        data: { townId: town.id },
      });

      return { ...town, warehouse };
    });
  }
}
