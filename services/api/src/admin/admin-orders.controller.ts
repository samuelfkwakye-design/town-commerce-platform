import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
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
}
