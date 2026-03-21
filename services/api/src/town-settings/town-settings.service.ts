import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TownSettingsService {
  constructor(private prisma: PrismaService) {}

  async getByTown(townId: string) {
    return this.prisma.townSettings.findUnique({
      where: { townId },
    });
  }

  async getByTownSlug(townSlug: string) {
    const town = await this.prisma.town.findUnique({
      where: { slug: townSlug },
      select: { id: true, name: true, slug: true },
    });

    if (!town) {
      return null;
    }

    const settings = await this.prisma.townSettings.findUnique({
      where: { townId: town.id },
    });

    return {
      town,
      settings: settings ?? {
        townId: town.id,
        deliveryFee: '0',
        serviceFee: '0',
        minimumOrder: '0',
        currency: 'GHS',
      },
    };
  }

  async upsert(
    townId: string,
    data: {
      deliveryFee?: string;
      serviceFee?: string;
      minimumOrder?: string;
      currency?: string;
    },
  ) {
    return this.prisma.townSettings.upsert({
      where: { townId },
      update: {
        ...(data.deliveryFee !== undefined ? { deliveryFee: data.deliveryFee as any } : {}),
        ...(data.serviceFee !== undefined ? { serviceFee: data.serviceFee as any } : {}),
        ...(data.minimumOrder !== undefined ? { minimumOrder: data.minimumOrder as any } : {}),
        ...(data.currency !== undefined ? { currency: data.currency } : {}),
      },
      create: {
        townId,
        deliveryFee: (data.deliveryFee ?? '0') as any,
        serviceFee: (data.serviceFee ?? '0') as any,
        minimumOrder: (data.minimumOrder ?? '0') as any,
        currency: data.currency ?? 'GHS',
      },
    });
  }
}