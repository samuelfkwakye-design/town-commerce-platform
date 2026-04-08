import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminKeyGuard } from '../auth/admin-key.guard';
import { AdminOrdersService } from './admin-orders.service';
import { CodCollectedDto } from '../orders/dto/cod-collected.dto';
import { OrdersService } from '../orders/orders.service';

@UseGuards(AdminKeyGuard)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(
    private readonly service: AdminOrdersService,
    private readonly ordersService: OrdersService,
  ) {}

  // PATCH /api/v1/admin/orders/:id/mark-cod-collected
  @Patch(':id/mark-cod-collected')
  markCodCollected(@Param('id') id: string, @Body() dto: CodCollectedDto) {
    return this.ordersService.markCodCollected(id, dto.note);
  }

  // GET /api/v1/admin/orders?status=CONFIRMED&townId=...&q=...&limit=20&cursor=...
  @Get()
  list(
    @Query('status') status?: string,
    @Query('townId') townId?: string,
    @Query('q') q?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.service.list({
      status,
      townId,
      q,
      from,
      to,
      limit: limit ? Number(limit) : undefined,
      cursor,
    });
  }

  // GET /api/v1/admin/orders/:id
  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  // POST /api/v1/admin/orders/:id/assign-driver
  @Post(':id/assign-driver')
  assignDriverById(
    @Param('id') id: string,
    @Body() body: { driverId: string },
  ) {
    return this.service.assignDriverById(id, body.driverId);
  }

  // POST /api/v1/admin/orders/:id/auto-assign-driver
  @Post(':id/auto-assign-driver')
  autoAssignDriver(@Param('id') id: string) {
    return this.service.autoAssignDriver(id);
  }

  // POST /api/v1/admin/orders/:id/assign-driver-manual
  @Post(':id/assign-driver-manual')
  assignDriverManual(
    @Param('id') id: string,
    @Body() body: { driverName: string; driverPhone: string },
  ) {
    return this.service.assignDriverManual(
      id,
      body.driverName,
      body.driverPhone,
    );
  }

  // PATCH /api/v1/admin/orders/:id/clear-driver
  @Patch(':id/clear-driver')
  clearDriver(@Param('id') id: string) {
    return this.service.clearDriver(id);
  }
}