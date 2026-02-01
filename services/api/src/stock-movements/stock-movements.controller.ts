import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { StockMovementsService } from './stock-movements.service';
import { ListStockMovementsQueryDto } from './dto/list-stock-movements.query.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly service: StockMovementsService) {}

  // GET /api/v1/stock-movements
  @Get()
  list(@Query() q: ListStockMovementsQueryDto) {
    return this.service.list(q);
  }

  // POST /api/v1/stock-movements/adjust
  @Post('adjust')
  adjust(@Body() dto: AdjustStockDto) {
    return this.service.adjust(dto);
  }
}
