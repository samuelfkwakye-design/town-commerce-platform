import { Body, Controller, ForbiddenException, Param, Post, UseGuards } from '@nestjs/common';
import { AdminKeyGuard } from '../../auth/admin-key.guard';
import { PrismaService } from '../../prisma/prisma.service';

@UseGuards(AdminKeyGuard)
@Controller('admin/town-products')
export class StockInvestigationDevController {
  constructor(private readonly prisma: PrismaService) {}

  private assertDevOnly() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('DEV endpoint disabled in production');
    }
  }

  @Post(':id/dev/inject-mismatch')
  async injectMismatch(
    @Param('id') townProductId: string,
    @Body() body: { deltaQty?: number; deltaWeightGrams?: number; note?: string },
  ) {
    this.assertDevOnly();

    const tp = await this.prisma.townProduct.findUnique({ where: { id: townProductId } });
    if (!tp) return { ok: false, message: 'TownProduct not found' };

    const pricingModel = tp.pricingModel as 'UNIT' | 'WEIGHT';

    const deltaQty = pricingModel === 'UNIT' ? Number(body.deltaQty ?? 1) : 0;
    const deltaWeightGrams = pricingModel === 'WEIGHT' ? Number(body.deltaWeightGrams ?? 250) : 0;

    await this.prisma.stockMovement.create({
      data: {
        townProductId,
        reason: 'MANUAL_ADJUSTMENT' as any,
        note: body.note ?? 'DEV mismatch injection',
        deltaQty: pricingModel === 'UNIT' ? deltaQty : null,
        deltaWeightGrams: pricingModel === 'WEIGHT' ? deltaWeightGrams : null,
      } as any,
    });

    return { ok: true, pricingModel, deltaQty, deltaWeightGrams };
  }
}
