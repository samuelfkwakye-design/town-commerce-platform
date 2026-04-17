import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { DriverService } from './driver.service';
import { DriverJwtGuard } from '../driver-auth/guards/driver-jwt.guard';

@Controller('driver')
@UseGuards(DriverJwtGuard)
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Get('orders')
  async getOrders(@Req() req: any) {
    return this.driverService.getAssignedOrders(req.driver.id);
  }

  @Post('orders/:id/pickup')
  async pickupOrder(@Req() req: any, @Param('id') orderId: string) {
    return this.driverService.pickupOrder(req.driver.id, orderId);
  }

  @Post('orders/:id/delivered')
  async deliverOrder(@Req() req: any, @Param('id') orderId: string) {
    return this.driverService.deliverOrder(req.driver.id, orderId);
  }
}
