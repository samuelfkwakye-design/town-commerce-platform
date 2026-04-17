import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StockMovementReason } from '@prisma/client';

import { OptionalCustomerAuthGuard } from '../customer-auth/optional-customer-auth.guard';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AddOrderItemDto } from './dto/add-order-item.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CompleteOrderDto } from './dto/complete-order.dto';
import { CodCollectedDto } from './dto/cod-collected.dto';
import { PayGoodsDto } from './dto/pay-goods.dto';
import { RefundItemsDto } from './dto/refund-items.dto';
import { QuoteOrderDto } from './dto/quote-order.dto';
import { AssignDriverDto } from './dto/assign-driver.dto';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { AdminRole, Roles } from '../common/auth/roles.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  // POST /api/v1/orders/quote
  @Post('quote')
  quote(@Body() dto: QuoteOrderDto) {
    return this.service.quoteOrder(dto);
  }

  // POST /api/v1/orders
  @Post()
  @UseGuards(OptionalCustomerAuthGuard)
  create(@Body() dto: CreateOrderDto, @Req() req: any) {
    const customerId = req.user?.id as string | undefined;
    return this.service.createOrder(dto, customerId);
  }

  // GET /api/v1/orders/:id
  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.getOrder(id);
  }

  // GET /api/v1/orders/:id/stock-movements?reason=FULFILMENT&limit=50
  @Get(':id/stock-movements')
  stockMovements(
    @Param('id') id: string,
    @Query('reason') reason?: StockMovementReason,
    @Query('limit') limit?: string,
  ) {
    return this.service.getStockMovementsForOrder(id, {
      reason,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // POST /api/v1/orders/:id/items
  @Post(':id/items')
  addItem(@Param('id') id: string, @Body() dto: AddOrderItemDto) {
    return this.service.addItem(id, dto);
  }

  // PATCH /api/v1/orders/:id
  // GLOBAL_SUPER_ADMIN only: edit customer/contact/address/order fee details
  @UseGuards(AdminJwtGuard, RolesGuard)
  @Roles(AdminRole.GLOBAL_SUPER_ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.service.updateOrder(id, dto);
  }

  // PATCH /api/v1/orders/:id/confirm
  @Patch(':id/confirm')
  confirm(@Param('id') id: string) {
    return this.service.confirmOrder(id);
  }

  // PATCH /api/v1/orders/admin/:id/confirm
  // GLOBAL_SUPER_ADMIN + TOWN_SUPER_ADMIN + WAREHOUSE_ADMIN
  @UseGuards(AdminJwtGuard, RolesGuard)
  @Roles(
    AdminRole.GLOBAL_SUPER_ADMIN,
    AdminRole.TOWN_SUPER_ADMIN,
    AdminRole.WAREHOUSE_ADMIN,
  )
  @Patch('admin/:id/confirm')
  adminConfirm(@Param('id') id: string) {
    return this.service.confirmOrder(id);
  }

  // PATCH /api/v1/orders/:id/assign-driver
  @Patch(':id/assign-driver')
  assignDriver(@Param('id') id: string, @Body() dto: AssignDriverDto) {
    return this.service.assignDriver(id, dto.driverName, dto.driverPhone);
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

  // POST /api/v1/orders/:id/refund-items
  @Post(':id/refund-items')
  refundItems(@Param('id') id: string, @Body() dto: RefundItemsDto) {
    return this.service.refundItems(id, dto.reason, dto.restock, dto.items);
  }

  // POST /api/v1/orders/:id/dev/rebuild-sale
  @Post(':id/dev/rebuild-sale')
  rebuildSale(@Param('id') id: string) {
    return this.service.devRebuildSale(id);
  }

  // PATCH /api/v1/orders/:id/cancel
  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.service.cancelOrder(id);
  }

  // PATCH /api/v1/orders/admin/:id/cod-collected
  // GLOBAL_SUPER_ADMIN + TOWN_SUPER_ADMIN + WAREHOUSE_ADMIN
  @UseGuards(AdminJwtGuard, RolesGuard)
  @Roles(
    AdminRole.GLOBAL_SUPER_ADMIN,
    AdminRole.TOWN_SUPER_ADMIN,
    AdminRole.WAREHOUSE_ADMIN,
  )
  @Patch('admin/:id/cod-collected')
  adminCodCollected(@Param('id') id: string, @Body() dto: CodCollectedDto) {
    return this.service.markCodCollected(id, dto.note);
  }

  // POST /api/v1/orders/:id/dev/force-settle
  // GLOBAL_SUPER_ADMIN only
  @UseGuards(AdminJwtGuard, RolesGuard)
  @Roles(AdminRole.GLOBAL_SUPER_ADMIN)
  @Post(':id/dev/force-settle')
  forceSettle(@Param('id') id: string) {
    return this.service.devForceSettle(id);
  }
}