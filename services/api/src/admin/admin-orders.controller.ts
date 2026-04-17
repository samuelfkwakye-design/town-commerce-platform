import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminOrdersService } from './admin-orders.service';
import { CodCollectedDto } from '../orders/dto/cod-collected.dto';
import { OrdersService } from '../orders/orders.service';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { AdminRole, Roles } from '../common/auth/roles.decorator';

type CurrentAdminUser = {
  sub: string;
  email?: string;
  username?: string;
  role: AdminRole;
  townId?: string | null;
};

@UseGuards(AdminJwtGuard, RolesGuard)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(
    private readonly service: AdminOrdersService,
    private readonly ordersService: OrdersService,
  ) {}

  // PATCH /api/v1/admin/orders/:id/mark-cod-collected
  @Patch(':id/mark-cod-collected')
  @Roles(AdminRole.GLOBAL_SUPER_ADMIN)
  async markCodCollected(
    @Param('id') id: string,
    @Body() dto: CodCollectedDto,
    @Req() req: any,
  ) {
    const adminUser = req.adminUser as CurrentAdminUser;
    await this.service.assertOrderAccess(id, adminUser);
    return this.ordersService.markCodCollected(id, dto.note);
  }

  // GET /api/v1/admin/orders?status=CONFIRMED&townId=...&q=...&limit=20&cursor=...
  @Get()
  @Roles(
    AdminRole.GLOBAL_SUPER_ADMIN,
    AdminRole.TOWN_SUPER_ADMIN,
    AdminRole.WAREHOUSE_ADMIN,
  )
  list(
    @Query('status') status?: string,
    @Query('townId') townId?: string,
    @Query('q') q?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Req() req?: any,
  ) {
    const adminUser = req.adminUser as CurrentAdminUser;

    return this.service.list(
      {
        status,
        townId,
        q,
        from,
        to,
        limit: limit ? Number(limit) : undefined,
        cursor,
      },
      adminUser,
    );
  }

  // GET /api/v1/admin/orders/:id
  @Get(':id')
  @Roles(
    AdminRole.GLOBAL_SUPER_ADMIN,
    AdminRole.TOWN_SUPER_ADMIN,
    AdminRole.WAREHOUSE_ADMIN,
  )
  get(@Param('id') id: string, @Req() req: any) {
    const adminUser = req.adminUser as CurrentAdminUser;
    return this.service.get(id, adminUser);
  }

  // POST /api/v1/admin/orders/:id/assign-driver
  @Post(':id/assign-driver')
  @Roles(
    AdminRole.GLOBAL_SUPER_ADMIN,
    AdminRole.TOWN_SUPER_ADMIN,
    AdminRole.WAREHOUSE_ADMIN,
  )
  assignDriverById(
    @Param('id') id: string,
    @Body() body: { driverId: string },
    @Req() req: any,
  ) {
    const adminUser = req.adminUser as CurrentAdminUser;
    return this.service.assignDriverById(id, body.driverId, adminUser);
  }

  // POST /api/v1/admin/orders/:id/auto-assign-driver
  @Post(':id/auto-assign-driver')
  @Roles(
    AdminRole.GLOBAL_SUPER_ADMIN,
    AdminRole.TOWN_SUPER_ADMIN,
    AdminRole.WAREHOUSE_ADMIN,
  )
  autoAssignDriver(@Param('id') id: string, @Req() req: any) {
    const adminUser = req.adminUser as CurrentAdminUser;
    return this.service.autoAssignDriver(id, adminUser);
  }

  // POST /api/v1/admin/orders/:id/assign-driver-manual
  @Post(':id/assign-driver-manual')
  @Roles(
    AdminRole.GLOBAL_SUPER_ADMIN,
    AdminRole.TOWN_SUPER_ADMIN,
    AdminRole.WAREHOUSE_ADMIN,
  )
  assignDriverManual(
    @Param('id') id: string,
    @Body() body: { driverName: string; driverPhone: string },
    @Req() req: any,
  ) {
    const adminUser = req.adminUser as CurrentAdminUser;
    return this.service.assignDriverManual(
      id,
      body.driverName,
      body.driverPhone,
      adminUser,
    );
  }

  // PATCH /api/v1/admin/orders/:id/clear-driver
  @Patch(':id/clear-driver')
  @Roles(
    AdminRole.GLOBAL_SUPER_ADMIN,
    AdminRole.TOWN_SUPER_ADMIN,
    AdminRole.WAREHOUSE_ADMIN,
  )
  clearDriver(@Param('id') id: string, @Req() req: any) {
    const adminUser = req.adminUser as CurrentAdminUser;
    return this.service.clearDriver(id, adminUser);
  }
}