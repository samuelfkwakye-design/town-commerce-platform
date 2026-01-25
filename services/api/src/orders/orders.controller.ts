import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AddOrderItemDto } from './dto/add-order-item.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CompleteOrderDto } from './dto/complete-order.dto';
import { CodCollectedDto } from './dto/cod-collected.dto';
import { PayGoodsDto } from './dto/pay-goods.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  // POST /api/v1/orders
  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.service.createOrder(dto);
  }

  // GET /api/v1/orders/:id
  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.getOrder(id);
  }

  // POST /api/v1/orders/:id/items
  @Post(':id/items')
  addItem(@Param('id') id: string, @Body() dto: AddOrderItemDto) {
    return this.service.addItem(id, dto);
  }

  // PATCH /api/v1/orders/:id
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.service.updateOrder(id, dto);
  }

  // PATCH /api/v1/orders/:id/confirm
  @Patch(':id/confirm')
  confirm(@Param('id') id: string) {
    return this.service.confirmOrder(id);
  }

  // PATCH /api/v1/orders/:id/complete
  @Patch(':id/complete')
  complete(@Param('id') id: string, @Body() dto: CompleteOrderDto) {
    return this.service.completeOrder(id, dto.code);
  }

  // PATCH /api/v1/orders/:id/cod-collected
  @Patch(':id/cod-collected')
  codCollected(@Param('id') id: string, @Body() dto: CodCollectedDto) {
    return this.service.markCodCollected(id, dto.note);
  }

  // POST /api/v1/orders/:id/pay-goods
  @Post(':id/pay-goods')
  payGoods(@Param('id') id: string, @Body() dto: PayGoodsDto) {
    return this.service.payGoods(id, dto.momoPhone, dto.note);
  }
}
