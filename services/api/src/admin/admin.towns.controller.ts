import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminKeyGuard } from '../auth/admin-key.guard';
import { CloneTownCatalogDto } from './dto/clone-town-catalog.dto';
import { AdminTownProductsService } from '../town-products/admin.town-products.service';

@Controller('admin/towns')
@UseGuards(AdminKeyGuard)
export class AdminTownsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminTownProductsService: AdminTownProductsService,
  ) {}

  @Get()
  async listTowns() {
    const rows = await this.prisma.town.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    return { rows };
  }

  @Post()
  async createTown(
    @Body()
    body: {
      name?: string;
      slug?: string;
      cloneFromTownId?: string | null;
      copyVariants?: boolean;
      copyImages?: boolean;
      copyStock?: boolean;
    },
  ) {
    const name = body?.name?.trim();
    const slug = body?.slug?.trim().toLowerCase();

    if (!name || !slug) {
      throw new BadRequestException('name and slug are required');
    }

    const existing = await this.prisma.town.findFirst({
      where: {
        OR: [{ name }, { slug }],
      },
      select: { id: true, name: true, slug: true },
    });

    if (existing) {
      throw new BadRequestException('A town with this name or slug already exists');
    }

    const createdTown = await this.prisma.town.create({
      data: { name, slug },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (body?.cloneFromTownId) {
      const cloneResult = await this.adminTownProductsService.cloneCatalogToTown(
        createdTown.id,
        {
          sourceTownId: body.cloneFromTownId,
          copyVariants: body.copyVariants ?? true,
          copyImages: body.copyImages ?? false,
          copyStock: body.copyStock ?? false,
        },
      );

      return {
        town: createdTown,
        catalogClone: cloneResult,
      };
    }

    return {
      town: createdTown,
      catalogClone: null,
    };
  }

  @Post(':targetTownId/clone-catalog')
  async cloneCatalogToTown(
    @Param('targetTownId') targetTownId: string,
    @Body() body: CloneTownCatalogDto,
  ) {
    return this.adminTownProductsService.cloneCatalogToTown(targetTownId, body);
  }
}