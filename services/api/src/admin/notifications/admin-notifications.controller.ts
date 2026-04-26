import { Controller, Delete, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../admin-auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { AdminRole, Roles } from '../../common/auth/roles.decorator';
import { AdminNotificationsService } from './admin-notifications.service';

@Controller('admin/notifications')
@UseGuards(AdminJwtGuard, RolesGuard)
@Roles(
  AdminRole.GLOBAL_SUPER_ADMIN,
  AdminRole.TOWN_SUPER_ADMIN,
  AdminRole.WAREHOUSE_ADMIN,
)
export class AdminNotificationsController {
  constructor(
    private readonly adminNotificationsService: AdminNotificationsService,
  ) {}

  @Get()
  list(@Req() req: any, @Query('unread') unread?: string) {
    return this.adminNotificationsService.list(
      req.adminUser,
      unread === 'true',
    );
  }

  @Patch(':id/read')
  markRead(@Req() req: any, @Param('id') id: string) {
    return this.adminNotificationsService.markRead(req.adminUser, id);
  }

  @Patch('read-all')
  markAllRead(@Req() req: any) {
    return this.adminNotificationsService.markAllRead(req.adminUser);
  }
    @Delete(':id')
  deleteOne(@Req() req: any, @Param('id') id: string) {
    return this.adminNotificationsService.deleteOne(req.adminUser, id);
  }

  @Delete()
  deleteAll(@Req() req: any) {
    return this.adminNotificationsService.deleteAll(req.adminUser);
  }
}
