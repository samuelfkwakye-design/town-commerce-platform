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
import { DriverAvailability } from '@prisma/client';
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

  @Get('orders/history')
  async getHistory(@Req() req: any) {
    return this.driverService.getDeliveryHistory(req.driver.id);
  }

  @Get('cod/summary')
  async getCodSummary(@Req() req: any) {
    return this.driverService.getCodSummary(req.driver.id);
  }

    @Get('earnings/summary')
  async getEarningsSummary(@Req() req: any) {
    return this.driverService.getEarningsSummary(req.driver.id);
  }
  @Patch('availability')
  async updateAvailability(
    @Req() req: any,
    @Body() body: { availability: DriverAvailability },
  ) {
    return this.driverService.updateAvailability(
      req.driver.id,
      body.availability,
    );
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