import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminDriversService } from './admin-drivers.service';
import { AdminJwtGuard } from '../../admin-auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles, AdminRole } from '../../common/auth/roles.decorator';

@Controller('admin/drivers')
@UseGuards(AdminJwtGuard, RolesGuard)
export class AdminDriversController {
  constructor(private readonly service: AdminDriversService) {}

  @Get()
  @Roles(
    AdminRole.GLOBAL_SUPER_ADMIN,
    AdminRole.TOWN_SUPER_ADMIN,
    AdminRole.WAREHOUSE_ADMIN,
  )
  list(@Query('townId') townId: string, @Req() req: any) {
    return this.service.list(townId, req.adminUser);
  }

  @Get(':id')
  @Roles(
    AdminRole.GLOBAL_SUPER_ADMIN,
    AdminRole.TOWN_SUPER_ADMIN,
    AdminRole.WAREHOUSE_ADMIN,
  )
  get(@Param('id') id: string, @Req() req: any) {
    return this.service.get(id, req.adminUser);
  }
  @Get(':id/orders')
  @Roles(
    AdminRole.GLOBAL_SUPER_ADMIN,
    AdminRole.TOWN_SUPER_ADMIN,
    AdminRole.WAREHOUSE_ADMIN,
  )
  getOrders(@Param('id') id: string, @Req() req: any) {
    return this.service.getOrders(id, req.adminUser);
  }
  @Post()
  @Roles(AdminRole.GLOBAL_SUPER_ADMIN, AdminRole.TOWN_SUPER_ADMIN)
  create(@Body() body: any, @Req() req: any) {
    return this.service.create(body, req.adminUser);
  }

  @Patch(':id')
  @Roles(AdminRole.GLOBAL_SUPER_ADMIN, AdminRole.TOWN_SUPER_ADMIN)
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.service.update(id, body, req.adminUser);
  }

  @Delete(':id')
  @Roles(AdminRole.GLOBAL_SUPER_ADMIN)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.adminUser);
  }
}