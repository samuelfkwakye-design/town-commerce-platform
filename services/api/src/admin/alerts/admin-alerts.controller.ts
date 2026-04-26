import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../admin-auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { AdminRole, Roles } from '../../common/auth/roles.decorator';
import { AdminAlertsService } from './admin-alerts.service';

@UseGuards(AdminJwtGuard, RolesGuard)
@Controller('admin/alerts')
export class AdminAlertsController {
  constructor(private readonly service: AdminAlertsService) {}

  @Get()
  @Roles(AdminRole.GLOBAL_SUPER_ADMIN, AdminRole.TOWN_SUPER_ADMIN)
  list(@Req() req: any) {
    return this.service.list(req.adminUser);
  }
}
