import { Injectable } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type CurrentAdmin = {
  sub: string;
  role: AdminRole;
  townId?: string | null;
};

@Injectable()
export class AdminNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private whereForAdmin(admin: CurrentAdmin) {
    if (admin.role === AdminRole.GLOBAL_SUPER_ADMIN) {
      return {};
    }

    if (admin.role === AdminRole.TOWN_SUPER_ADMIN || admin.role === AdminRole.WAREHOUSE_ADMIN) {
      return {
        townId: admin.townId ?? '__NO_TOWN__',
      };
    }

    return {
      id: '__NO_NOTIFICATION__',
    };
  }

  async list(admin: CurrentAdmin, onlyUnread = false) {
    const where = {
      ...this.whereForAdmin(admin),
      ...(onlyUnread ? { isRead: false } : {}),
    };

    const [rows, unreadCount] = await Promise.all([
      this.prisma.adminNotification.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      }),
      this.prisma.adminNotification.count({
        where: {
          ...this.whereForAdmin(admin),
          isRead: false,
        },
      }),
    ]);

    return {
      rows,
      unreadCount,
    };
  }

  async markRead(admin: CurrentAdmin, id: string) {
    const existing = await this.prisma.adminNotification.findFirst({
      where: {
        id,
        ...this.whereForAdmin(admin),
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return { ok: true };
    }

    await this.prisma.adminNotification.update({
      where: { id },
      data: { isRead: true },
    });

    return { ok: true };
  }

  async markAllRead(admin: CurrentAdmin) {
    await this.prisma.adminNotification.updateMany({
      where: {
        ...this.whereForAdmin(admin),
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return { ok: true };
  }
}
