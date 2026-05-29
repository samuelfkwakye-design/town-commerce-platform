import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloneTownCatalogDto } from './dto/clone-town-catalog.dto';
import { AdminTownProductsService } from '../town-products/admin.town-products.service';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { RolesGuard } from '../common/auth/roles.guard';

type TownContactBody = {
  name?: string;
  slug?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  whatsappNumber?: string | null;
  supportName?: string | null;
  contactAddress?: string | null;
  openingHours?: string | null;
};

function cleanOptionalText(value?: string | null) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

@Controller('admin/towns')
@UseGuards(AdminJwtGuard, RolesGuard)
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
        contactEmail: true,
        contactPhone: true,
        whatsappNumber: true,
        supportName: true,
        contactAddress: true,
        openingHours: true,
      },
    });

    return { rows };
  }

  @Post()
  async createTown(
    @Body()
    body: TownContactBody & {
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
      data: {
        name,
        slug,
        contactEmail: cleanOptionalText(body.contactEmail),
        contactPhone: cleanOptionalText(body.contactPhone),
        whatsappNumber: cleanOptionalText(body.whatsappNumber),
        supportName: cleanOptionalText(body.supportName),
        contactAddress: cleanOptionalText(body.contactAddress),
        openingHours: cleanOptionalText(body.openingHours),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        contactEmail: true,
        contactPhone: true,
        whatsappNumber: true,
        supportName: true,
        contactAddress: true,
        openingHours: true,
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

  @Patch(':townId')
  async updateTown(
    @Param('townId') townId: string,
    @Body() body: TownContactBody,
  ) {
    const existingTown = await this.prisma.town.findUnique({
      where: { id: townId },
      select: { id: true },
    });

    if (!existingTown) {
      throw new BadRequestException('Town not found');
    }

    const name = body.name?.trim();
    const slug = body.slug?.trim().toLowerCase();

    if (name || slug) {
      const duplicate = await this.prisma.town.findFirst({
        where: {
          id: { not: townId },
          OR: [
            ...(name ? [{ name }] : []),
            ...(slug ? [{ slug }] : []),
          ],
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new BadRequestException('A town with this name or slug already exists');
      }
    }

    const updatedTown = await this.prisma.town.update({
      where: { id: townId },
      data: {
        ...(name ? { name } : {}),
        ...(slug ? { slug } : {}),
        contactEmail: cleanOptionalText(body.contactEmail),
        contactPhone: cleanOptionalText(body.contactPhone),
        whatsappNumber: cleanOptionalText(body.whatsappNumber),
        supportName: cleanOptionalText(body.supportName),
        contactAddress: cleanOptionalText(body.contactAddress),
        openingHours: cleanOptionalText(body.openingHours),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        contactEmail: true,
        contactPhone: true,
        whatsappNumber: true,
        supportName: true,
        contactAddress: true,
        openingHours: true,
      },
    });

    return { town: updatedTown };
  }

  @Post(':targetTownId/clone-catalog')
  async cloneCatalogToTown(
    @Param('targetTownId') targetTownId: string,
    @Body() body: CloneTownCatalogDto,
  ) {
    return this.adminTownProductsService.cloneCatalogToTown(targetTownId, body);
  }
}