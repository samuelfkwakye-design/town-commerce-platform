import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.product.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async create(name: string, description?: string) {
    const trimmed = (name ?? '').trim();
    if (!trimmed) throw new BadRequestException('Product name is required');

    return this.prisma.product.create({
      data: {
        name: trimmed,
        description: description?.trim() || null,
      },
    });
  }
}
