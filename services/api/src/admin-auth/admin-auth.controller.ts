import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { RequestAdminPasswordResetDto } from './dto/request-admin-password-reset.dto';
import { ResetAdminPasswordDto } from './dto/reset-admin-password.dto';
import { ChangeAdminPasswordDto } from './dto/change-admin-password.dto';
import { AdminJwtGuard } from './guards/admin-jwt.guard';

@Controller('admin-auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  login(@Body() dto: AdminLoginDto) {
    return this.adminAuthService.login(dto);
  }

  @UseGuards(AdminJwtGuard)
  @Get('me')
  me(@Req() req: any) {
    return this.adminAuthService.me(req.adminUser);
  }

  @Post('forgot-password/request')
  requestPasswordReset(@Body() dto: RequestAdminPasswordResetDto) {
    return this.adminAuthService.requestPasswordReset(dto);
  }

  @Post('forgot-password/reset')
  resetPassword(@Body() dto: ResetAdminPasswordDto) {
    return this.adminAuthService.resetPassword(dto);
  }

  @UseGuards(AdminJwtGuard)
  @Post('change-password')
  changePassword(@Req() req: any, @Body() dto: ChangeAdminPasswordDto) {
    return this.adminAuthService.changePassword(req.adminUser, dto);
  }
}