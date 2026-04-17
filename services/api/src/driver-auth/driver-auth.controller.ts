import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { DriverAuthService } from './driver-auth.service';
import { DriverJwtGuard } from './guards/driver-jwt.guard';

@Controller('driver-auth')
export class DriverAuthController {
  constructor(private readonly driverAuthService: DriverAuthService) {}

  @Post('login')
  async login(@Body('phone') phone?: string) {
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      throw new BadRequestException('Phone is required');
    }

    return this.driverAuthService.login(phone);
  }

  @Get('me')
  @UseGuards(DriverJwtGuard)
  async me(@Req() req: any) {
    return this.driverAuthService.getMe(req.driver.id);
  }
}
