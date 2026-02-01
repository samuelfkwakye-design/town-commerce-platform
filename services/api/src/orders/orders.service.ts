import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  PaymentPurpose,
  PaymentStatus,
  PricingModel,
  RefundStatus,
} from '@prisma/client';

import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { HubtelService } from '../hubtel/hubtel.service';

import { AddOrderItemDto } from './dto/add-order-item.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { RefundItemLineDto } from './dto/refund-items.dto';
import { Prisma, StockMovementReason } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hubtel: HubtelService,
  ) {}
    private dec(value: string | number): Prisma.Decimal {
    return new Prisma.Decimal(String(value));
  }

  // Full refund (already implemented previously in this project; re-adding entry point)
  async refundGoods(orderId: string, reason?: string, restock?: boolean) {
    // TEMP: keep compilation green; we will reinsert the full implementation next.
    return { ok: false, message: 'refundGoods temporarily not wired in this build' };
  }

      // Partial refund (base exists previously; re-adding entry point)
      async refundItems(
  orderId: string,
  reason?: string,
  restock?: boolean,
  items?: RefundItemLineDto[],

) {
console.log('REFUND_ITEMS CALLED', {
  orderId,
  restock,
  items,
});

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: true,
      },
    });
    if (!order) throw new NotFoundException(`Order not found: ${orderId}`);

  if (order.status !== OrderStatus.SETTLED && order.status !== OrderStatus.PARTIALLY_REFUNDED) {
  throw new BadRequestException(
    'Partial refund allowed only when order is SETTLED or PARTIALLY_REFUNDED',
  );
}


    const goodsPayment = order.payments.find(
      (p) => p.purpose === PaymentPurpose.COD_GOODS && p.status === PaymentStatus.SUCCESS,
    );
    if (!goodsPayment) {
      throw new BadRequestException('Goods payment not found or not SUCCESS');
    }

    if (!items || items.length === 0) {
      throw new BadRequestException('At least one refund item is required');
    }

        const refund = await this.prisma.refund.create({
      data: {
        paymentId: goodsPayment.id,
        reason: reason ?? 'partial refund',
        restock: !!restock,
        amount: this.dec('0.00'),
        status: RefundStatus.REQUESTED,
      },
    });


        const orderWithItems = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { refundItems: true } },
      },
    });
    if (!orderWithItems) throw new NotFoundException(`Order not found: ${orderId}`);

    const itemById = new Map(orderWithItems.items.map((i) => [i.id, i]));

    let totalRefund = new Prisma.Decimal(0);

const restocked = new Map<
  string,
  { townProductId: string; stockQty?: number; stockWeightGrams?: number }
>();


await this.prisma.$transaction(async (tx) => {

        for (const line of items) {
        const oi = itemById.get(line.orderItemId);
        if (!oi) {
          throw new BadRequestException(`Order item ${line.orderItemId} does not belong to this order`);
        }

        const hasQty = typeof line.quantity === 'number';
        const hasWg = typeof line.weightGrams === 'number';
        if ((hasQty && hasWg) || (!hasQty && !hasWg)) {
          throw new BadRequestException(
            `Refund item ${line.orderItemId} must include exactly one of quantity or weightGrams`,
          );
        }

        const refundedQty = (oi.refundItems ?? []).reduce((s, r) => s + (r.quantity ?? 0), 0);
        const refundedWg = (oi.refundItems ?? []).reduce((s, r) => s + (r.weightGrams ?? 0), 0);

        let amount: Prisma.Decimal;

        if (hasQty) {
          if (!oi.quantity) throw new BadRequestException(`Order item ${oi.id} is not a UNIT item`);
          if (line.quantity! > oi.quantity - refundedQty) {
            throw new BadRequestException(`Refund quantity exceeds remaining quantity for item ${oi.id}`);
          }

          amount = new Prisma.Decimal(oi.unitPrice).mul(line.quantity!);

         await tx.refundItem.create({
  data: {
    refundId: refund.id,
    orderItemId: oi.id,
    quantity: line.quantity!,
    amount,
  },
});

if (restock && line.quantity! > 0) {
  const tp = await tx.townProduct.update({
    where: { id: oi.townProductId },
    data: { stockQty: { increment: line.quantity! } },
    select: { id: true, stockQty: true },
  });

  await this.recordStockMovement(tx, {
    townProductId: oi.townProductId,
    reason: StockMovementReason.REFUND,
    orderId: order.id,
    refundId: refund.id,
    deltaQty: line.quantity!,
  });

  restocked.set(tp.id, {
    townProductId: tp.id,
    stockQty: tp.stockQty ?? undefined,
  });
}

       } else {
  if (!oi.weightGrams) throw new BadRequestException(`Order item ${oi.id} is not a WEIGHT item`);
          if (line.weightGrams! > oi.weightGrams - refundedWg) {
            throw new BadRequestException(`Refund grams exceed remaining grams for item ${oi.id}`);
          }

          const perGram = new Prisma.Decimal(oi.lineTotal).div(oi.weightGrams);
          amount = perGram.mul(line.weightGrams!);

          await tx.refundItem.create({
  data: {
    refundId: refund.id,
    orderItemId: oi.id,
    weightGrams: line.weightGrams!,
    amount,
  },
});

if (restock && line.weightGrams! > 0) {
  const tp = await tx.townProduct.update({
    where: { id: oi.townProductId },
    data: { stockWeightGrams: { increment: line.weightGrams! } },
    select: { id: true, stockWeightGrams: true },
  });

  await this.recordStockMovement(tx, {
    townProductId: oi.townProductId,
    reason: StockMovementReason.REFUND,
    orderId: order.id,
    refundId: refund.id,
    deltaWeightGrams: line.weightGrams!,
  });

  restocked.set(tp.id, {
    townProductId: tp.id,
    stockWeightGrams: tp.stockWeightGrams ?? undefined,
  });
}

        }

        totalRefund = totalRefund.add(amount);
      }

      await tx.refund.update({
        where: { id: refund.id },
        data: { amount: totalRefund },
      });

      const itemsAfter = await tx.orderItem.findMany({
        where: { orderId },
        include: { refundItems: true },
      });

      const fullyRefunded = itemsAfter.every((i) => {
        const q = (i.refundItems ?? []).reduce((s, r) => s + (r.quantity ?? 0), 0);
        const g = (i.refundItems ?? []).reduce((s, r) => s + (r.weightGrams ?? 0), 0);
        return (i.quantity == null || q >= i.quantity) && (i.weightGrams == null || g >= i.weightGrams);
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: fullyRefunded ? OrderStatus.CANCELLED : OrderStatus.PARTIALLY_REFUNDED,
        },
      });
    });

   return {
  ok: true,
  refundId: refund.id,
  amount: totalRefund,
  restocked: Array.from(restocked.values()),
};

  }

  private generateDeliveryCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  async createOrder(dto: CreateOrderDto) {
    const town = await this.prisma.town.findUnique({ where: { id: dto.townId } });
    if (!town) throw new NotFoundException(`Town not found: ${dto.townId}`);

    return this.prisma.order.create({
      data: {
        townId: dto.townId,
        customerEmail: dto.customerEmail ?? null,
        customerPhone: dto.customerPhone ?? null,

        // If not provided, Prisma default (COD) applies
        goodsPaymentMethod: dto.goodsPaymentMethod ?? undefined,

        status: OrderStatus.DRAFT,
        subtotal: this.dec('0.00'),
        total: this.dec('0.00'),
      },
      include: { items: true },
    });
  }

  async getOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        town: true,
        items: {
          include: {
            townProduct: { include: { product: true, town: true } },
          },
        },
        payments: true,
      },
    });

    if (!order) throw new NotFoundException(`Order not found: ${id}`);
    return order;
  }
async getStockMovementsForOrder(
  orderId: string,
  options?: {
    reason?: StockMovementReason;
    limit?: number;
  },
) {
  return this.prisma.stockMovement.findMany({
    where: {
      orderId,
      ...(options?.reason ? { reason: options.reason } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 100,
  });
}

  async addItem(orderId: string, dto: AddOrderItemDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order not found: ${orderId}`);

    // LOCKING RULE: no item edits after DRAFT
    if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException('You can only add items to a DRAFT order');
    }

    const townProduct = await this.prisma.townProduct.findUnique({
      where: { id: dto.townProductId },
      include: { product: true, town: true },
    });

    if (!townProduct) {
      throw new NotFoundException(`TownProduct not found: ${dto.townProductId}`);
    }

    if (townProduct.townId !== order.townId) {
      throw new BadRequestException('TownProduct does not belong to this order’s town');
    }
    // ---- Stock validation (pre-check) ----
    // Only enforce when stock is tracked (not null/undefined).
    // Also account for items already in THIS order (so repeated adds can't bypass stock limits).
    const existingItems = await this.prisma.orderItem.findMany({
      where: { orderId, townProductId: townProduct.id },
      select: { quantity: true, weightGrams: true },
    });

    const alreadyQty = existingItems.reduce((sum, it) => sum + (it.quantity ?? 0), 0);
    const alreadyGrams = existingItems.reduce((sum, it) => sum + (it.weightGrams ?? 0), 0);

    // UNIT pricing
    if (townProduct.pricingModel === PricingModel.UNIT) {
      if (!dto.quantity || dto.quantity < 1) {
        throw new BadRequestException('UNIT items require quantity (>= 1)');
      }
      if (dto.weightGrams !== undefined) {
        throw new BadRequestException('UNIT items must not include weightGrams');
      }
      if (!townProduct.pricePerUnit) {
        throw new BadRequestException('TownProduct is missing pricePerUnit');
      }
      // Enforce available stock if stockQty is tracked
      if (townProduct.stockQty !== null && townProduct.stockQty !== undefined) {
        const requested = dto.quantity;
        const available = townProduct.stockQty;

        if (alreadyQty + requested > available) {
          throw new BadRequestException(
            `Insufficient stock. Available: ${available}, in-order: ${alreadyQty}, requested: ${requested}`,
          );
        }
      }

      const unitPrice = townProduct.pricePerUnit;
      const lineTotal = unitPrice.mul(dto.quantity);

      const created = await this.prisma.orderItem.create({
        data: {
          orderId,
          townProductId: townProduct.id,
          quantity: dto.quantity,
          weightGrams: null,
          unitPrice,
          lineTotal,
        },
      });

      await this.recalculateTotals(orderId);
      return created;
    }

    // WEIGHT pricing
    if (townProduct.pricingModel === PricingModel.WEIGHT) {
      if (!dto.weightGrams || dto.weightGrams < 1) {
        throw new BadRequestException('WEIGHT items require weightGrams (>= 1)');
      }
      if (dto.quantity !== undefined) {
        throw new BadRequestException('WEIGHT items must not include quantity');
      }
      if (!townProduct.pricePerKg) {
        throw new BadRequestException('TownProduct is missing pricePerKg');
      }
      // Enforce available stock if stockWeightGrams is tracked
      if (townProduct.stockWeightGrams !== null && townProduct.stockWeightGrams !== undefined) {
        const requested = dto.weightGrams;
        const available = townProduct.stockWeightGrams;

        if (alreadyGrams + requested > available) {
          throw new BadRequestException(
            `Insufficient stock (grams). Available: ${available}, in-order: ${alreadyGrams}, requested: ${requested}`,
          );
        }
      }

      const unitPrice = townProduct.pricePerKg;
      const kg = new Prisma.Decimal(dto.weightGrams).div(1000);
      const lineTotal = unitPrice.mul(kg);

      const created = await this.prisma.orderItem.create({
        data: {
          orderId,
          townProductId: townProduct.id,
          quantity: null,
          weightGrams: dto.weightGrams,
          unitPrice,
          lineTotal,
        },
      });

      await this.recalculateTotals(orderId);
      return created;
    }

    throw new BadRequestException('Unsupported pricing model');
  }

  async updateOrder(orderId: string, dto: UpdateOrderDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order not found: ${orderId}`);

    // LOCKING RULES:
    // - DRAFT: allow contact + fee updates
    // - CONFIRMED: allow ONLY contact updates (email/phone)
    // - others: no updates
    const isDraft = order.status === OrderStatus.DRAFT;
    const isConfirmed = order.status === OrderStatus.CONFIRMED;

    if (!isDraft && !isConfirmed) {
      throw new BadRequestException('Only DRAFT or CONFIRMED orders can be updated');
    }

    const hasEmail = dto.customerEmail !== undefined;
    const hasPhone = dto.customerPhone !== undefined;
    const hasDeliveryFee = dto.deliveryFee !== undefined;
    const hasServiceFee = dto.serviceFee !== undefined;

    if (!hasEmail && !hasPhone && !hasDeliveryFee && !hasServiceFee) {
      throw new BadRequestException(
        'Provide customerEmail, customerPhone, deliveryFee and/or serviceFee',
      );
    }

    // If CONFIRMED, block fee changes
    if (isConfirmed && (hasDeliveryFee || hasServiceFee)) {
      throw new BadRequestException('Fees cannot be changed after order confirmation');
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        customerEmail: hasEmail ? dto.customerEmail ?? null : undefined,
        customerPhone: hasPhone ? dto.customerPhone ?? null : undefined,

        deliveryFee: isDraft && hasDeliveryFee ? this.dec(dto.deliveryFee!) : undefined,
        serviceFee: isDraft && hasServiceFee ? this.dec(dto.serviceFee!) : undefined,
      },
    });

    if (isDraft && (hasDeliveryFee || hasServiceFee)) {
      await this.recalculateTotals(orderId);
    }

    return this.getOrder(orderId);
  }

  async confirmOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new NotFoundException(`Order not found: ${orderId}`);

    if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT orders can be confirmed');
    }

    if (order.items.length === 0) {
      throw new BadRequestException('Cannot confirm an empty order');
    }

    if (!order.customerEmail && !order.customerPhone) {
      throw new BadRequestException(
        'Order confirmation requires at least an email or phone number',
      );
    }

    await this.recalculateTotals(orderId);

    const code = this.generateDeliveryCode();
    const deliveryCodeHash = this.hashCode(code);
    const deliveryCodeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CONFIRMED,
        deliveryCodeHash,
        deliveryCodeExpiresAt,
      },
    });

    return { ...updated, deliveryCode: code };
  }

  private async deductStockForFulfilment(tx: Prisma.TransactionClient, orderId: string) {
    const orderWithItems = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { townProduct: true } },
      },
    });

    if (!orderWithItems) throw new NotFoundException(`Order not found: ${orderId}`);

    if (orderWithItems.items.length === 0) {
      throw new BadRequestException('Cannot fulfil an order with no items');
    }

    for (const item of orderWithItems.items) {
      const tp = item.townProduct;

      if (tp.pricingModel === PricingModel.UNIT) {
        const qty = item.quantity ?? 0;
        if (qty < 1) throw new BadRequestException('UNIT item missing quantity');

        // stockQty null => not tracked
        if (tp.stockQty === null || tp.stockQty === undefined) continue;

        const updated = await tx.townProduct.updateMany({
          where: {
            id: tp.id,
            stockQty: { not: null, gte: qty },
          },
          data: { stockQty: { decrement: qty } },
        });

        if (updated.count !== 1) {
          throw new BadRequestException(`Insufficient stock for townProduct ${tp.id}`);
        }
        await this.recordStockMovement(tx, {
  townProductId: tp.id,
  reason: StockMovementReason.FULFILMENT,
  orderId,
  deltaQty: -qty,
});

        continue;
      }

      if (tp.pricingModel === PricingModel.WEIGHT) {
        const grams = item.weightGrams ?? 0;
        if (grams < 1) throw new BadRequestException('WEIGHT item missing weightGrams');

        // stockWeightGrams null => not tracked
        if (tp.stockWeightGrams === null || tp.stockWeightGrams === undefined) continue;

        const updated = await tx.townProduct.updateMany({
          where: {
            id: tp.id,
            stockWeightGrams: { not: null, gte: grams },
          },
          data: { stockWeightGrams: { decrement: grams } },
        });

        if (updated.count !== 1) {
          throw new BadRequestException(`Insufficient stock (grams) for townProduct ${tp.id}`);
        }
        
      }
    }
  }

  async completeOrder(orderId: string, code: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new NotFoundException(`Order not found: ${orderId}`);

    // ✅ Idempotent: do not double-deduct stock
    if (order.status === OrderStatus.FULFILLED || order.status === OrderStatus.SETTLED) {
      return order;
    }

    if (order.status !== OrderStatus.CONFIRMED && order.status !== OrderStatus.PAID) {
      throw new BadRequestException('Order can only be completed from CONFIRMED or PAID');
    }

    if (!order.deliveryCodeHash) {
      throw new BadRequestException('Delivery code is not set for this order');
    }

    if (order.deliveryCodeExpiresAt && order.deliveryCodeExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Delivery code has expired');
    }

    const incomingHash = this.hashCode(code);

    if (incomingHash !== order.deliveryCodeHash) {
      throw new BadRequestException('Invalid delivery code');
    }

    // ✅ Atomic: deduct stock + fulfil in one transaction
    return this.prisma.$transaction(async (tx) => {
      await this.deductStockForFulfilment(tx, orderId);

      return tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.FULFILLED,
          deliveryCodeHash: null,
          deliveryCodeExpiresAt: null,
        },
      });
    });
  }

  // Driver confirms cash was collected for goods (COD only) → SETTLED
  async markCodCollected(orderId: string, note?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) throw new NotFoundException(`Order not found: ${orderId}`);

    if (order.status === OrderStatus.SETTLED) {
      throw new BadRequestException('Order is already settled');
    }

    const existing = order.payments.find((p) => p.purpose === PaymentPurpose.COD_GOODS);
    if (existing?.status === PaymentStatus.SUCCESS) {
      throw new BadRequestException('COD already marked as collected');
    }

    if (order.status !== OrderStatus.FULFILLED) {
      throw new BadRequestException('COD can only be collected after delivery (FULFILLED)');
    }

    if (order.goodsPaymentMethod !== PaymentMethod.COD) {
      throw new BadRequestException(
        'This order is set to MOMO on delivery. Cash collection is not allowed.',
      );
    }

    const [, settled] = await this.prisma.$transaction([
      this.prisma.payment.upsert({
        where: {
          orderId_purpose: {
            orderId,
            purpose: PaymentPurpose.COD_GOODS,
          },
        },
        create: {
          orderId,
          purpose: PaymentPurpose.COD_GOODS,
          method: PaymentMethod.COD,
          status: PaymentStatus.SUCCESS,
          amount: order.payOnDeliveryTotal,
          currency: 'GHS',
          provider: 'COD',
          hubtelResponse: note ? { note } : undefined,
        },
        update: {
          status: PaymentStatus.SUCCESS,
          method: PaymentMethod.COD,
          provider: 'COD',
          hubtelResponse: note ? { note } : undefined,
        },
      }),

      this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.SETTLED },
        include: { payments: true, items: true },
      }),
    ]);

    return settled;
  }

  /**
   * Initiate MOMO payment for goods (after delivery)
   * - Creates/updates Payment as INITIATED
   * - Calls Hubtel Direct Receive (dev-safe if not configured)
   * - Stores Hubtel response & TransactionId (if returned)
   * - Webhook will later mark SUCCESS + SETTLED
   */
  async payGoods(orderId: string, momoPhone?: string, note?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) throw new NotFoundException(`Order not found: ${orderId}`);

    if (order.status === OrderStatus.SETTLED) {
      throw new BadRequestException('Order is already settled');
    }

    if (order.status !== OrderStatus.FULFILLED) {
      throw new BadRequestException(
        'Goods payment can only be initiated after delivery (FULFILLED)',
      );
    }

    if (order.goodsPaymentMethod !== PaymentMethod.MOMO) {
      throw new BadRequestException(
        'This order is set to COD for goods. Use /cod-collected instead.',
      );
    }

    const payToPhone = momoPhone ?? order.customerPhone ?? null;
    if (!payToPhone) {
      throw new BadRequestException(
        'MoMo payment requires a phone number (provide momoPhone or set customerPhone on the order)',
      );
    }

    const existing = order.payments.find((p) => p.purpose === PaymentPurpose.COD_GOODS);

    if (existing?.status === PaymentStatus.SUCCESS) {
      throw new BadRequestException('Goods payment is already marked as paid');
    }

    // Idempotent if INITIATED already
    if (existing?.status === PaymentStatus.INITIATED) {
      return {
        orderId: order.id,
        paymentId: existing.id,
        status: existing.status,
        amount: existing.amount,
        currency: existing.currency,
        provider: existing.provider,
        clientReference: existing.clientReference,
        payToPhone,
        message: 'Goods payment already initiated',
      };
    }

    const clientReference =
      existing?.clientReference ??
      `goods_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

    // Upsert payment INITIATED
    const payment = await this.prisma.payment.upsert({
      where: {
        orderId_purpose: {
          orderId: order.id,
          purpose: PaymentPurpose.COD_GOODS,
        },
      },
      create: {
        orderId: order.id,
        purpose: PaymentPurpose.COD_GOODS,
        method: PaymentMethod.MOMO,
        status: PaymentStatus.INITIATED,
        amount: order.payOnDeliveryTotal,
        currency: 'GHS',
        provider: 'HUBTEL',
        clientReference,
        hubtelResponse: {
          stage: 'INITIATED_LOCAL',
          payToPhone,
          note: note ?? null,
        },
      },
      update: {
        method: PaymentMethod.MOMO,
        status: PaymentStatus.INITIATED,
        provider: 'HUBTEL',
        clientReference,
        hubtelResponse: {
          stage: 'INITIATED_LOCAL',
          payToPhone,
          note: note ?? null,
        },
      },
    });

    const callbackUrl = (process.env.HUBTEL_CALLBACK_URL ?? '').trim();

    // NOTE: payOnDeliveryTotal is a Prisma.Decimal. Make a clean "120.00" string.
    const amountStr = new Prisma.Decimal(order.payOnDeliveryTotal).toFixed(2);

    // Call Hubtel (dev-safe)
    const hubtelRes = await this.hubtel.receiveMoney({
      destination: payToPhone,
      amount: amountStr,
      clientReference: payment.clientReference!,
      callbackUrl,
      description: note ?? 'Goods payment',
    });

    const txId =
      (hubtelRes as any)?.transactionId ??
      (hubtelRes as any)?.json?.TransactionId ??
      (hubtelRes as any)?.json?.Data?.TransactionId ??
      (hubtelRes as any)?.json?.data?.transactionId ??
      null;

    // Persist Hubtel response
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        hubtelTransactionId: txId ?? undefined,
        hubtelResponse: hubtelRes as any,
      },
    });

    return {
      orderId: order.id,
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      provider: payment.provider,
      clientReference: payment.clientReference,
      payToPhone,
      hubtelConfigured: !!(hubtelRes as any)?.configured,
      hubtelOk: !!(hubtelRes as any)?.ok,
      message: (hubtelRes as any)?.ok
        ? 'Goods payment initiated (Hubtel request sent)'
        : 'Goods payment initiated (Hubtel not configured / request not sent)',
    };
  }
private async recordStockMovement(
  tx: Prisma.TransactionClient,
  params: {
    townProductId: string;
    reason: StockMovementReason;
    orderId?: string;
    refundId?: string;
    deltaQty?: number;
    deltaWeightGrams?: number;
    note?: string;
  },
) {
  const { deltaQty, deltaWeightGrams } = params;

  const hasQty = typeof deltaQty === 'number' && deltaQty !== 0;
  const hasWeight =
    typeof deltaWeightGrams === 'number' && deltaWeightGrams !== 0;

  // exactly one delta must be provided
  if ((hasQty && hasWeight) || (!hasQty && !hasWeight)) {
    throw new Error(
      `Invalid StockMovement delta for townProductId=${params.townProductId}. Provide exactly one of deltaQty or deltaWeightGrams (non-zero).`,
    );
  }

  await tx.stockMovement.create({
    data: {
      townProductId: params.townProductId,
      reason: params.reason,
      orderId: params.orderId ?? null,
      refundId: params.refundId ?? null,
      deltaQty: hasQty ? deltaQty : null,
      deltaWeightGrams: hasWeight ? deltaWeightGrams : null,
      note: params.note?.trim() || null,
    },
  });
}

  private async recalculateTotals(orderId: string) {
    const [items, order] = await Promise.all([
      this.prisma.orderItem.findMany({ where: { orderId } }),
      this.prisma.order.findUnique({ where: { id: orderId } }),
    ]);

    if (!order) throw new NotFoundException(`Order not found: ${orderId}`);

    let itemsSubtotal = new Prisma.Decimal(0);
    for (const item of items) {
      itemsSubtotal = itemsSubtotal.add(item.lineTotal);
    }

    const deliveryFee = new Prisma.Decimal(order.deliveryFee ?? 0);
    const serviceFee = new Prisma.Decimal(order.serviceFee ?? 0);

    const payNowTotal = deliveryFee.add(serviceFee);
    const payOnDeliveryTotal = itemsSubtotal;

    const subtotal = itemsSubtotal;
    const total = itemsSubtotal.add(deliveryFee).add(serviceFee);

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        itemsSubtotal,
        deliveryFee,
        serviceFee,
        payNowTotal,
        payOnDeliveryTotal,
        subtotal,
        total,
      },
    });
  }
}
