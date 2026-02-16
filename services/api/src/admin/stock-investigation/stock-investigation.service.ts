
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TownProductStockDto } from './dto/stock.dto';
import { StockMovementsPageDto } from './dto/stock-movement.dto';

@Injectable()
export class StockInvestigationService {
  constructor(private readonly prisma: PrismaService) {}

  private toNum(v: any): number | null {
    if (v === null || v === undefined) return null;
    const n = typeof v === 'string' ? Number(v) : Number(v);
    return Number.isFinite(n) ? n : null;
  }

  async getTownProductStock(townProductId: string): Promise<TownProductStockDto> {
    const tp = await this.prisma.townProduct.findUnique({
      where: { id: townProductId },
    });

    if (!tp) throw new NotFoundException('TownProduct not found');

    const [town, product] = await Promise.all([
      this.prisma.town.findUnique({ where: { id: tp.townId } }),
      this.prisma.product.findUnique({ where: { id: tp.productId } }),
    ]);

    if (!town) throw new NotFoundException('Town not found for TownProduct');
    if (!product) throw new NotFoundException('Product not found for TownProduct');

    const agg = await this.prisma.stockMovement.aggregate({
      where: { townProductId },
      _sum: { deltaQty: true, deltaWeightGrams: true },
      _max: { createdAt: true },
    });

    const pricingModel = tp.pricingModel as 'UNIT' | 'WEIGHT';

    // Snapshot is stored on TownProduct in your schema
    const snapshotQty = this.toNum((tp as any).stockQty ?? null);
    const snapshotWeightGrams = this.toNum((tp as any).stockWeightGrams ?? null);

    const ledgerQty = this.toNum(agg._sum.deltaQty ?? null);
    const ledgerWeightGrams = this.toNum(agg._sum.deltaWeightGrams ?? null);

    const diffQty =
      snapshotQty === null && ledgerQty === null ? null : (snapshotQty ?? 0) - (ledgerQty ?? 0);

    const diffWeightGrams =
      snapshotWeightGrams === null && ledgerWeightGrams === null
        ? null
        : (snapshotWeightGrams ?? 0) - (ledgerWeightGrams ?? 0);

    const isMismatch =
      pricingModel === 'UNIT' ? (diffQty ?? 0) !== 0 : (diffWeightGrams ?? 0) !== 0;

    return {
      townProductId: tp.id,

      townId: tp.townId,
      townName: (town as any).name,
      townSlug: (town as any).slug,

      productId: tp.productId,
      productName: (product as any).name,

      pricingModel,

      snapshotQty,
      snapshotWeightGrams,

      ledgerQty,
      ledgerWeightGrams,

      diffQty,
      diffWeightGrams,

      lastMovementAt: agg._max.createdAt ? agg._max.createdAt.toISOString() : null,
      snapshotUpdatedAt: tp.updatedAt ? tp.updatedAt.toISOString() : null,

      isMismatch,
    };
  }

  async getTownProductStockMovements(args: {
    townProductId: string;
    limit: number;
    cursor?: string;
  }): Promise<StockMovementsPageDto> {
    const { townProductId } = args;
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);

    const rows = await this.prisma.stockMovement.findMany({
      where: { townProductId },
      take: limit + 1,
      ...(args.cursor
        ? {
            skip: 1,
            cursor: { id: args.cursor },
          }
        : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    const hasNextPage = rows.length > limit;
    const pageItems = rows.slice(0, limit);

    const nextCursor = hasNextPage ? pageItems[pageItems.length - 1]?.id ?? null : null;

    return {
      items: pageItems.map((m) => {
        const reason = (m as any).reason ?? null;
        const type = (m as any).type ?? reason ?? 'UNKNOWN';

        return {
          id: m.id,
          createdAt: m.createdAt.toISOString(),

          townProductId: m.townProductId,

          type,
          reason,

          deltaQty: this.toNum((m as any).deltaQty ?? null),
          deltaWeightGrams: this.toNum((m as any).deltaWeightGrams ?? null),

          orderId: (m as any).orderId ?? null,
          orderItemId: (m as any).orderItemId ?? null,
          refundId: (m as any).refundId ?? null,
          refundItemId: (m as any).refundItemId ?? null,

          note: (m as any).note ?? null,
        };
      }),
      pageInfo: {
        limit,
        hasNextPage,
        nextCursor,
      },
    };
  }

  async reconcileTownProductStock(townProductId: string): Promise<TownProductStockDto> {
    const tp = await this.prisma.townProduct.findUnique({
      where: { id: townProductId },
    });
    if (!tp) throw new NotFoundException('TownProduct not found');

    const pricingModel = tp.pricingModel as 'UNIT' | 'WEIGHT';

    const agg = await this.prisma.stockMovement.aggregate({
      where: { townProductId },
      _sum: { deltaQty: true, deltaWeightGrams: true },
      _max: { createdAt: true },
    });

    const ledgerQty = this.toNum(agg._sum.deltaQty ?? null);
    const ledgerWeightGrams = this.toNum(agg._sum.deltaWeightGrams ?? null);

    if (pricingModel === 'UNIT' && ledgerWeightGrams !== null && ledgerWeightGrams !== 0) {
      throw new BadRequestException('UNIT product has weight movements; cannot reconcile safely');
    }
    if (pricingModel === 'WEIGHT' && ledgerQty !== null && ledgerQty !== 0) {
      throw new BadRequestException('WEIGHT product has qty movements; cannot reconcile safely');
    }

    await this.prisma.townProduct.update({
      where: { id: townProductId },
      data: {
        stockQty: pricingModel === 'UNIT' ? (ledgerQty ?? 0) : null,
        stockWeightGrams: pricingModel === 'WEIGHT' ? (ledgerWeightGrams ?? 0) : null,
      } as any,
    });

    return this.getTownProductStock(townProductId);
  }

  async listStockMismatches(args: {
    limit: number;
    cursor?: string;
  }): Promise<{
    items: TownProductStockDto[];
    pageInfo: { limit: number; hasNextPage: boolean; nextCursor: string | null };
  }> {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);

    const townProducts = await this.prisma.townProduct.findMany({
      take: limit + 1,
      ...(args.cursor ? { skip: 1, cursor: { id: args.cursor } } : {}),
      orderBy: { id: 'asc' },
    });

    const hasNextPage = townProducts.length > limit;
    const page = townProducts.slice(0, limit);

    const stocks = await Promise.all(page.map((tp) => this.getTownProductStock(tp.id)));
    const mismatches = stocks.filter((s) => s.isMismatch);

    return {
      items: mismatches,
      pageInfo: {
        limit,
        hasNextPage,
        nextCursor: hasNextPage ? page[page.length - 1]?.id ?? null : null,
      },
    };
  }
}
