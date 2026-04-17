import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles, AdminRole } from '../common/auth/roles.decorator';

@Controller('admin/admin-users')
@UseGuards(AdminJwtGuard, RolesGuard)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @Roles(AdminRole.GLOBAL_SUPER_ADMIN, AdminRole.TOWN_SUPER_ADMIN)
  listAdmins(@Req() req: any) {
    return this.adminUsersService.listAdmins(req.adminUser);
  }

  @Get(':id')
  @Roles(AdminRole.GLOBAL_SUPER_ADMIN, AdminRole.TOWN_SUPER_ADMIN)
  getAdminById(@Req() req: any, @Param('id') id: string) {
    return this.adminUsersService.getAdminById(req.adminUser, id);
  }

  @Post()
  @Roles(AdminRole.GLOBAL_SUPER_ADMIN, AdminRole.TOWN_SUPER_ADMIN)
  createAdmin(@Req() req: any, @Body() dto: CreateAdminUserDto) {
    return this.adminUsersService.createAdmin(req.adminUser, dto);
  }

  @Patch(':id')
  @Roles(AdminRole.GLOBAL_SUPER_ADMIN, AdminRole.TOWN_SUPER_ADMIN)
  updateAdmin(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.adminUsersService.updateAdmin(req.adminUser, id, dto);
  }
}