import {
  Body,
  Controller,
  Get,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentCustomer } from './customer-auth.decorator';
import { CustomerAuthGuard } from './customer-auth.guard';
import { CustomerAuthService } from './customer-auth.service';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
@Controller('customer-auth')
export class CustomerAuthController {
  constructor(private readonly authService: CustomerAuthService) {}

  @Post('register')
  register(@Body() dto: RegisterCustomerDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.register(dto, res);
  }

  @Post('login')
  login(@Body() dto: LoginCustomerDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res);
  }
  @Post('forgot-password/request')
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto.phone);
  }

  @Post('forgot-password/reset')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.phone, dto.code, dto.newPassword);
  }
  @Post('logout')
logout(
  @Res({ passthrough: true }) res: Response,
) {
  return this.authService.logout(res);
}

   @Get('me')
  @UseGuards(CustomerAuthGuard)
  async me(@CurrentCustomer() customer: any) {
    const fullCustomer = await this.authService.getCustomer(customer.id);

    return {
      ok: true,
      customer: fullCustomer,
    };
  }
}
