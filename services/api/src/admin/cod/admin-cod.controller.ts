import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AdminCodService } from './admin-cod.service';
import { AdminJwtGuard } from '../../admin-auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { AdminRole, Roles } from '../../common/auth/roles.decorator';

@UseGuards(AdminJwtGuard, RolesGuard)
@Controller('admin/cod')
export class AdminCodController {
  constructor(private readonly service: AdminCodService) {}

  @Get('outstanding')
  @Roles(
    AdminRole.GLOBAL_SUPER_ADMIN,
    AdminRole.TOWN_SUPER_ADMIN,
  )
  getOutstanding(@Req() req: any) {
    return this.service.getOutstandingByDriver(req.adminUser);
  }
}
