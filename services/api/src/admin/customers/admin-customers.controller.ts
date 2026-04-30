import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AdminCustomersService } from './admin-customers.service';
import { AdminJwtGuard } from '../../admin-auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles, AdminRole } from '../../common/auth/roles.decorator';

@Controller('admin/customers')
@UseGuards(AdminJwtGuard, RolesGuard)
export class AdminCustomersController {
  constructor(private readonly adminCustomersService: AdminCustomersService) {}

  @Get()
  @Roles(
    AdminRole.GLOBAL_SUPER_ADMIN,
    AdminRole.TOWN_SUPER_ADMIN,
    AdminRole.WAREHOUSE_ADMIN,
  )
  listCustomers(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('townId') townId?: string,
  ) {
    return this.adminCustomersService.listCustomers(
      {
        search,
        townId,
      },
      req.adminUser,
    );
  }
}