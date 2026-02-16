import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AdminKeyGuard } from '../../auth/admin-key.guard';
import { UseGuards } from '@nestjs/common';
import { StockInvestigationService } from './stock-investigation.service';

@UseGuards(AdminKeyGuard)
@Controller('admin')
export class StockInvestigationController {
  constructor(private readonly svc: StockInvestigationService) {}

  // 1) GET /api/v1/admin/town-products/:id/stock
  @Get('town-products/:id/stock')
  async getStock(@Param('id') id: string) {
    return this.svc.getTownProductStock(id);
  }

  // 2) GET /api/v1/admin/town-products/:id/stock-movements?limit=20&cursor=...
  @Get('town-products/:id/stock-movements')
  async getMovements(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.svc.getTownProductStockMovements({
      townProductId: id,
      limit: limit ? Number(limit) : 20,
      cursor: cursor || undefined,
    });
  }

  // 3) POST /api/v1/admin/town-products/:id/reconcile
  @Post('town-products/:id/reconcile')
  async reconcile(@Param('id') id: string) {
    return this.svc.reconcileTownProductStock(id);
  }

  // 4) GET /api/v1/admin/stock-mismatches?limit=20&cursor=...
  @Get('stock-mismatches')
  async mismatches(@Query('limit') limit?: string, @Query('cursor') cursor?: string) {
    return this.svc.listStockMismatches({
      limit: limit ? Number(limit) : 20,
      cursor: cursor || undefined,
    });
  }
}
