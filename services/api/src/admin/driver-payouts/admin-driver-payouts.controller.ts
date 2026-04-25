import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../admin-auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { AdminRole, Roles } from '../../common/auth/roles.decorator';
import { AdminDriverPayoutsService } from './admin-driver-payouts.service';

@UseGuards(AdminJwtGuard, RolesGuard)
@Controller('admin/driver-payouts')
export class AdminDriverPayoutsController {
  constructor(private readonly service: AdminDriverPayoutsService) {}

  @Get('summary')
  @Roles(AdminRole.GLOBAL_SUPER_ADMIN, AdminRole.TOWN_SUPER_ADMIN)
  summary(@Req() req: any) {
    return this.service.summary(req.adminUser);
  }

  @Post('pay')
  @Roles(AdminRole.GLOBAL_SUPER_ADMIN, AdminRole.TOWN_SUPER_ADMIN)
  markPaid(
    @Req() req: any,
    @Body()
    body: {
      driverId?: string;
      amount?: number;
      note?: string;
    },
  ) {
    return this.service.markPaid(req.adminUser, body);
  }
}
