import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { StockMovementsService } from './stock-movements.service';
import { ListStockMovementsQueryDto } from './dto/list-stock-movements.query.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ReconcileStockQueryDto } from './dto/reconcile-stock.query.dto';
import { AdminKeyGuard } from '../auth/admin-key.guard';
import { BaselineFromSnapshotDto } from './dto/baseline-from-snapshot.dto';
import { FixMismatchDto } from './dto/fix-mismatch.dto';
import { DevLedgerOnlyDto } from './dto/dev-ledger-only.dto';

@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly service: StockMovementsService) {}

  // GET /api/v1/stock-movements (public)
  @Get()
  list(@Query() q: ListStockMovementsQueryDto) {
    return this.service.list(q);
  }

  // GET /api/v1/stock-movements/reconcile (admin)
  @UseGuards(AdminKeyGuard)
  @Get('reconcile')
  reconcile(@Query() q: ReconcileStockQueryDto) {
    return this.service.reconcile(q);
  }

  // GET /api/v1/stock-movements/:townProductId (admin)
  @UseGuards(AdminKeyGuard)
  @Get(':townProductId')
  getTownProductStock(@Param('townProductId') townProductId: string) {
    return this.service.getTownProductStock(townProductId);
  }

  // POST /api/v1/stock-movements/:townProductId/reconcile (admin)
  @UseGuards(AdminKeyGuard)
  @Post(':townProductId/reconcile')
  reconcileTownProduct(
    @Param('townProductId') townProductId: string,
    @Body() body: { note?: string },
  ) {
    return this.service.reconcileTownProduct(townProductId, body?.note);
  }

  // POST /api/v1/stock-movements/:townProductId/manual-adjustment (admin)
  @UseGuards(AdminKeyGuard)
  @Post(':townProductId/manual-adjustment')
  manualAdjustment(
    @Param('townProductId') townProductId: string,
    @Body() body: { deltaQty?: number; deltaWeightGrams?: number; note: string },
  ) {
    return this.service.manualLedgerAdjustment({
      townProductId,
      deltaQty: body?.deltaQty,
      deltaWeightGrams: body?.deltaWeightGrams,
      note: body?.note,
    });
  }

  // POST /api/v1/stock-movements/dev/ledger-only (admin, dev-only)
  @UseGuards(AdminKeyGuard)
  @Post('dev/ledger-only')
  devLedgerOnly(@Body() dto: DevLedgerOnlyDto) {
    return this.service.devLedgerOnly(dto);
  }

  // POST /api/v1/stock-movements/adjust (admin)
  @UseGuards(AdminKeyGuard)
  @Post('adjust')
  adjust(@Body() dto: AdjustStockDto) {
    return this.service.adjust(dto);
  }

  // POST /api/v1/stock-movements/fix-mismatch (admin)
  @UseGuards(AdminKeyGuard)
  @Post('fix-mismatch')
  fixMismatch(@Body() dto: FixMismatchDto) {
    return this.service.fixMismatch(dto.townProductId, dto.note);
  }

  // POST /api/v1/stock-movements/baseline-from-snapshot (admin)
  @UseGuards(AdminKeyGuard)
  @Post('baseline-from-snapshot')
  baselineFromSnapshot(@Body() dto: BaselineFromSnapshotDto) {
    return this.service.baselineFromSnapshot(dto);
  }
}
