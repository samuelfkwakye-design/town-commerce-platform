import { Controller, Get, Query } from '@nestjs/common';
import { StockMovementsService } from './stock-movements.service';
import { ListStockMovementsQueryDto } from './dto/list-stock-movements.query.dto';

@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly service: StockMovementsService) {}

  // GET /api/v1/stock-movements
  @Get()
  list(@Query() q: ListStockMovementsQueryDto) {
    return this.service.list(q);
  }
}
