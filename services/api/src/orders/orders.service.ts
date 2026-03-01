import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  PaymentPurpose,
  PaymentStatus,
  PricingModel,
  RefundStatus,
  Prisma,
  StockMovementReason,
} from '@prisma/client';

import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { HubtelService } from '../hubtel/hubtel.service';

import { AddOrderItemDto } from './dto/add-order-item.dto';
import { CreateOrderDto, CreateOrderItemDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { RefundItemLineDto } from './dto/refund-items.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hubtel: HubtelService,
  ) {}

  private dec(value: string | number): Prisma.Decimal {
    return new Prisma.Decimal(String(value));
  }

  // -------------------------
  // COD Admin (unchanged)
  // -------------------------
  async markCodCollectedAdmin(orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { payments: true },
      });

      if (!order) {
        throw new NotFoundException(`Order not found: ${orderId}`);
      }

      if (order.status !== 'FULFILLED') {
        throw new BadRequestException(
          'COD can only be collected for FULFILLED orders',
        );
      }

      if (order.goodsPaymentMethod !== 'COD') {
        throw new BadRequestException(
          'Order is not COD (cannot mark COD collected)',
        );
      }

      const alreadySettled = (order.payments ?? []).some(
        (p) => p.purpose === 'COD_GOODS' && p.status === 'SUCCESS',
      );
      if (alreadySettled) {
        throw new BadRequestException(
          'Order already has a SUCCESS COD_GOODS payment',
        );
      }

      const amount = order.payOnDeliveryTotal ?? order.total;

      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          purpose: 'COD_GOODS',
          method: 'COD',
          status: 'SUCCESS',
          amount,
          currency: 'GHS',
          provider: 'OPS',
          hubtelResponse: { note: 'markCodCollected' },
        },
      });

      const updated = await tx.order.update({
        where: { id: order.id },
        data: { status: 'SETTLED' },
      });

      return { ...updated, payments: [payment] };
    });
  }

  // -------------------------
  // Refunds (unchanged)
  // -------------------------
  async refundGoods(orderId: string, reason?: string, restock?: boolean) {
    return {
      ok: false,
      message: 'refundGoods temporarily not wired in this build',
    };
  }

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
    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.REFUNDED
    ) {
      throw new BadRequestException(
        'Refund is not allowed for CANCELLED or REFUNDED orders',
      );
    }

    if (
      order.status !== OrderStatus.SETTLED &&
      order.status !== OrderStatus.PARTIALLY_REFUNDED
    ) {
      throw new BadRequestException(
        'Partial refund allowed only when order is SETTLED or PARTIALLY_REFUNDED',
      );
    }

    const goodsPayment = order.payments.find(
      (p) =>
        p.purpose === PaymentPurpose.COD_GOODS &&
        p.status === PaymentStatus.SUCCESS,
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
    if (!orderWithItems)
      throw new NotFoundException(`Order not found: ${orderId}`);

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
          throw new BadRequestException(
            `Order item ${line.orderItemId} does not belong to this order`,
          );
        }

        const hasQty = typeof line.quantity === 'number';
        const hasWg = typeof line.weightGrams === 'number';
        if ((hasQty && hasWg) || (!hasQty && !hasWg)) {
          throw new BadRequestException(
            `Refund item ${line.orderItemId} must include exactly one of quantity or weightGrams`,
          );
        }

        const refundedQty = (oi.refundItems ?? []).reduce(
          (s, r) => s + (r.quantity ?? 0),
          0,
        );
        const refundedWg = (oi.refundItems ?? []).reduce(
          (s, r) => s + (r.weightGrams ?? 0),
          0,
        );

        let amount: Prisma.Decimal;

        if (hasQty) {
          if (!oi.quantity)
            throw new BadRequestException(
              `Order item ${oi.id} is not a UNIT item`,
            );
          if (line.quantity! > oi.quantity - refundedQty) {
            throw new BadRequestException(
              `Refund quantity exceeds remaining quantity for item ${oi.id}`,
            );
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
          if (!oi.weightGrams)
            throw new BadRequestException(
              `Order item ${oi.id} is not a WEIGHT item`,
            );
          if (line.weightGrams! > oi.weightGrams - refundedWg) {
            throw new BadRequestException(
              `Refund grams exceed remaining grams for item ${oi.id}`,
            );
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
        const q = (i.refundItems ?? []).reduce(
          (s, r) => s + (r.quantity ?? 0),
          0,
        );
        const g = (i.refundItems ?? []).reduce(
          (s, r) => s + (r.weightGrams ?? 0),
          0,
        );
        return (
          (i.quantity == null || q >= i.quantity) &&
          (i.weightGrams == null || g >= i.weightGrams)
        );
      });

      const current = await tx.order.findUnique({
        where: { id: orderId },
        select: { status: true },
      });
      if (!current) throw new NotFoundException(`Order not found: ${orderId}`);

      const wasDelivered =
        current.status === OrderStatus.FULFILLED ||
        current.status === OrderStatus.SETTLED ||
        current.status === OrderStatus.PARTIALLY_REFUNDED;

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: fullyRefunded
            ? wasDelivered
              ? OrderStatus.REFUNDED
              : OrderStatus.CANCELLED
            : OrderStatus.PARTIALLY_REFUNDED,
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

  // -------------------------
  // Helpers (unchanged)
  // -------------------------
  private generateDeliveryCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  // ✅ NEW: shared add item logic (transaction-safe)
  private async addItemTx(
    tx: Prisma.TransactionClient,
    orderId: string,
    orderTownId: string,
    dto: {
      townProductId: string;
      quantity?: number;
      weightGrams?: number;
      townProductVariantId?: string;
    },
  ) {
    const townProduct = await tx.townProduct.findUnique({
      where: { id: dto.townProductId },
      include: { product: true, town: true },
    });

    if (!townProduct) {
      throw new NotFoundException(`TownProduct not found: ${dto.townProductId}`);
    }

    if (townProduct.townId !== orderTownId) {
      throw new BadRequestException('TownProduct does not belong to this order’s town');
    }

    const existingItems = await tx.orderItem.findMany({
      where: { orderId, townProductId: townProduct.id },
      select: { quantity: true, weightGrams: true },
    });

    const alreadyQty = existingItems.reduce((sum, it) => sum + (it.quantity ?? 0), 0);
    const alreadyGrams = existingItems.reduce((sum, it) => sum + (it.weightGrams ?? 0), 0);

    // UNIT
    if (townProduct.pricingModel === PricingModel.UNIT) {
      if (!dto.quantity || dto.quantity < 1) {
        throw new BadRequestException('UNIT items require quantity (>= 1)');
      }
      if (dto.weightGrams !== undefined) {
        throw new BadRequestException('UNIT items must not include weightGrams');
      }
      if (dto.townProductVariantId !== undefined) {
        throw new BadRequestException('UNIT items must not include townProductVariantId');
      }
      if (!townProduct.pricePerUnit) {
        throw new BadRequestException('TownProduct is missing pricePerUnit');
      }

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

      return tx.orderItem.create({
        data: {
          orderId,
          townProductId: townProduct.id,
          townProductVariantId: null,
          quantity: dto.quantity,
          weightGrams: null,
          unitPrice,
          lineTotal,
        },
      });
    }

    // WEIGHT
    if (townProduct.pricingModel === PricingModel.WEIGHT) {
      if (!dto.weightGrams || dto.weightGrams < 1) {
        throw new BadRequestException('WEIGHT items require weightGrams (>= 1)');
      }
      if (dto.quantity !== undefined) {
        throw new BadRequestException('WEIGHT items must not include quantity');
      }
      if (dto.townProductVariantId !== undefined) {
        throw new BadRequestException('WEIGHT items must not include townProductVariantId');
      }
      if (!townProduct.pricePerKg) {
        throw new BadRequestException('TownProduct is missing pricePerKg');
      }

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

      return tx.orderItem.create({
        data: {
          orderId,
          townProductId: townProduct.id,
          townProductVariantId: null,
          quantity: null,
          weightGrams: dto.weightGrams,
          unitPrice,
          lineTotal,
        },
      });
    }

    // ✅ VARIANT
    if (townProduct.pricingModel === PricingModel.VARIANT) {
      if (!dto.quantity || dto.quantity < 1) {
        throw new BadRequestException('VARIANT items require quantity (>= 1)');
      }
      if (dto.weightGrams !== undefined) {
        throw new BadRequestException('VARIANT items must not include weightGrams');
      }
      if (!dto.townProductVariantId) {
        throw new BadRequestException('VARIANT items require townProductVariantId');
      }

      const variant = await tx.townProductVariant.findUnique({
        where: { id: dto.townProductVariantId },
      });
      if (!variant) {
        throw new NotFoundException(`TownProductVariant not found: ${dto.townProductVariantId}`);
      }
      if (variant.townProductId !== townProduct.id) {
        throw new BadRequestException('Variant does not belong to this TownProduct');
      }
      if (!variant.isActive) {
        throw new BadRequestException('Variant is not active');
      }

      // Stock: treat VARIANT like UNIT (TownProduct stockQty)
      if (townProduct.stockQty !== null && townProduct.stockQty !== undefined) {
        const requested = dto.quantity;
        const available = townProduct.stockQty;
        if (alreadyQty + requested > available) {
          throw new BadRequestException(
            `Insufficient stock. Available: ${available}, in-order: ${alreadyQty}, requested: ${requested}`,
          );
        }
      }

      const unitPrice = new Prisma.Decimal(variant.unitPrice);
      const lineTotal = unitPrice.mul(dto.quantity);

      return tx.orderItem.create({
        data: {
          orderId,
          townProductId: townProduct.id,
          townProductVariantId: variant.id,
          quantity: dto.quantity,
          weightGrams: null,
          unitPrice,
          lineTotal,
        },
      });
    }

    throw new BadRequestException('Unsupported pricing model');
  }

  // ✅ UPDATED: create order now supports items[] (UNIT/WEIGHT/VARIANT)
  async createOrder(dto: CreateOrderDto) {
  const town = await this.prisma.town.findUnique({
    where: { id: dto.townId },
  });
  if (!town) throw new NotFoundException(`Town not found: ${dto.townId}`);

  if (!dto.items || dto.items.length === 0) {
    throw new BadRequestException('Order must include at least one item');
  }

  const orderId = await this.prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        townId: dto.townId,
        customerEmail: dto.customerEmail ?? null,
        customerPhone: dto.customerPhone ?? null,
        goodsPaymentMethod: dto.goodsPaymentMethod ?? undefined,
        status: OrderStatus.DRAFT,
        subtotal: this.dec('0.00'),
        total: this.dec('0.00'),
      },
      select: { id: true, townId: true },
    });

    for (const item of dto.items) {
      await this.addItemTx(tx, order.id, order.townId, item);
    }

    // ✅ Use tx-aware totals inside the transaction
    await this.recalculateTotalsTx(tx, order.id);

    return order.id;
  });

  // ✅ Now it’s committed, safe to fetch with normal prisma
  return this.getOrder(orderId);
}

  async getOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        town: true,

        items: {
          include: {
            townProduct: { include: { product: true, town: true } },
            variant: true, // ✅ include variant for VARIANT items
            refundItems: true,
          },
        },

        payments: {
          include: {
            Refund: {
              include: {
                items: {
                  include: {
                    orderItem: true,
                  },
                },
              },
            },
          },
        },

        sale: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!order) throw new NotFoundException(`Order not found: ${id}`);
    return order;
  }

  // -------------------------
  // DEV settle (unchanged)
  // -------------------------
  async devForceSettle(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException(`Order not found: ${orderId}`);

    if (
      order.status !== OrderStatus.FULFILLED &&
      order.status !== OrderStatus.SETTLED
    ) {
      throw new BadRequestException(
        'Can only force-settle after delivery (FULFILLED)',
      );
    }

    await this.prisma.payment.upsert({
      where: {
        orderId_purpose: {
          orderId,
          purpose: PaymentPurpose.COD_GOODS,
        },
      },
      create: {
        orderId,
        purpose: PaymentPurpose.COD_GOODS,
        method: order.goodsPaymentMethod,
        status: PaymentStatus.SUCCESS,
        amount: order.payOnDeliveryTotal,
        currency: 'GHS',
        provider: 'DEV',
        hubtelResponse: { note: 'devForceSettle' } as any,
      },
      update: {
        status: PaymentStatus.SUCCESS,
        provider: 'DEV',
        hubtelResponse: { note: 'devForceSettle' } as any,
      },
    });

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.SETTLED },
      include: { payments: true, items: true },
    });
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

  // ✅ UPDATED: addItem supports VARIANT now (via shared helper)
  async addItem(orderId: string, dto: AddOrderItemDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException(`Order not found: ${orderId}`);

    if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException('You can only add items to a DRAFT order');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      return this.addItemTx(tx, orderId, order.townId, dto);
    });

    await this.recalculateTotals(orderId);
    return created;
  }

  async updateOrder(orderId: string, dto: UpdateOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException(`Order not found: ${orderId}`);

    const isDraft = order.status === OrderStatus.DRAFT;
    const isConfirmed = order.status === OrderStatus.CONFIRMED;

    if (!isDraft && !isConfirmed) {
      throw new BadRequestException(
        'Only DRAFT or CONFIRMED orders can be updated',
      );
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

    if (isConfirmed && (hasDeliveryFee || hasServiceFee)) {
      throw new BadRequestException(
        'Fees cannot be changed after order confirmation',
      );
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        customerEmail: hasEmail ? (dto.customerEmail ?? null) : undefined,
        customerPhone: hasPhone ? (dto.customerPhone ?? null) : undefined,

        deliveryFee:
          isDraft && hasDeliveryFee ? this.dec(dto.deliveryFee!) : undefined,
        serviceFee:
          isDraft && hasServiceFee ? this.dec(dto.serviceFee!) : undefined,
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

  // ✅ UPDATED: deduct stock handles VARIANT like UNIT
  private async deductStockForFulfilment(
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    const orderWithItems = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { townProduct: true } },
      },
    });

    if (!orderWithItems)
      throw new NotFoundException(`Order not found: ${orderId}`);

    if (orderWithItems.items.length === 0) {
      throw new BadRequestException('Cannot fulfil an order with no items');
    }

    for (const item of orderWithItems.items) {
      const tp = item.townProduct;

      // UNIT + VARIANT (both quantity-based)
      if (
        tp.pricingModel === PricingModel.UNIT ||
        tp.pricingModel === PricingModel.VARIANT
      ) {
        const qty = item.quantity ?? 0;
        if (qty < 1)
          throw new BadRequestException('UNIT/VARIANT item missing quantity');

        if (tp.stockQty === null || tp.stockQty === undefined) continue;

        const updated = await tx.townProduct.updateMany({
          where: {
            id: tp.id,
            stockQty: { not: null, gte: qty },
          },
          data: { stockQty: { decrement: qty } },
        });

        if (updated.count !== 1) {
          throw new BadRequestException(
            `Insufficient stock for townProduct ${tp.id}`,
          );
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
        if (grams < 1)
          throw new BadRequestException('WEIGHT item missing weightGrams');

        if (tp.stockWeightGrams === null || tp.stockWeightGrams === undefined)
          continue;

        const updated = await tx.townProduct.updateMany({
          where: {
            id: tp.id,
            stockWeightGrams: { not: null, gte: grams },
          },
          data: { stockWeightGrams: { decrement: grams } },
        });

        if (updated.count !== 1) {
          throw new BadRequestException(
            `Insufficient stock (grams) for townProduct ${tp.id}`,
          );
        }

        await this.recordStockMovement(tx, {
          townProductId: tp.id,
          reason: StockMovementReason.FULFILMENT,
          orderId,
          deltaWeightGrams: -grams,
        });

        continue;
      }

      throw new BadRequestException(
        `Unsupported pricing model for townProduct ${tp.id}`,
      );
    }
  }

  // ✅ UPDATED: sale snapshot supports VARIANT like UNIT (quantity-based)
  private async createSaleForDeliveredOrder(
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new NotFoundException(`Order not found: ${orderId}`);
    if (order.items.length === 0) {
      throw new BadRequestException(
        'Cannot create sale for order with no items',
      );
    }

    const existingSale = await tx.sale.findUnique({
      where: { orderId },
      include: { items: { select: { id: true } } },
    });

    if (existingSale && existingSale.items.length > 0) return existingSale;

    const sale =
      existingSale ??
      (await tx.sale.create({
        data: {
          orderId: order.id,
          townId: order.townId,
        },
        include: { items: { select: { id: true } } },
      }));

    const townProductIds = Array.from(
      new Set(order.items.map((i) => i.townProductId)),
    );

    const tps = await tx.townProduct.findMany({
  where: { id: { in: townProductIds } },
  select: {
    id: true,
    pricingModel: true,
    costPerUnit: true,
    costPerKg: true,
    variants: {
      select: {
        id: true,
        unitCost: true,
      },
    },
  },
});

    const tpById = new Map(tps.map((tp) => [tp.id, tp]));

    for (const item of order.items) {
      const tp = tpById.get(item.townProductId);
      if (!tp) {
        throw new BadRequestException(
          `TownProduct not found: ${item.townProductId}`,
        );
      }

      const revenue = new Prisma.Decimal(item.lineTotal);

      // UNIT + VARIANT
      if (tp.pricingModel === PricingModel.UNIT) {
  const qty = item.quantity ?? 0;
  if (qty < 1) {
    throw new BadRequestException(`UNIT item missing quantity: ${item.id}`);
  }
  if (tp.costPerUnit == null) {
    throw new BadRequestException(`Missing costPerUnit for TownProduct ${tp.id}`);
  }

  const unitPrice = new Prisma.Decimal(item.unitPrice); // per unit
  const unitCost = new Prisma.Decimal(tp.costPerUnit); // per unit
  const cogs = unitCost.mul(qty);
  const profit = revenue.sub(cogs);

  await tx.saleItem.upsert({
    where: { orderItemId: item.id },
    create: {
      saleId: sale.id,
      orderItemId: item.id,
      townProductId: item.townProductId,
      quantity: qty,
      weightGrams: null,
      unitPrice,
      revenue,
      unitCost,
      cogs,
      profit,
    },
    update: {
      saleId: sale.id,
      townProductId: item.townProductId,
      quantity: qty,
      weightGrams: null,
      unitPrice,
      revenue,
      unitCost,
      cogs,
      profit,
    },
  });

  continue;
}

if (tp.pricingModel === PricingModel.VARIANT) {
  const qty = item.quantity ?? 0;
  if (qty < 1) {
    throw new BadRequestException(`VARIANT item missing quantity: ${item.id}`);
  }

  const variantId = item.townProductVariantId;
  if (!variantId) {
    throw new BadRequestException(`VARIANT item missing townProductVariantId: ${item.id}`);
  }

  const v = (tp.variants ?? []).find((x) => x.id === variantId);
  const unitCostRaw = v?.unitCost ?? tp.costPerUnit ?? null;

  if (unitCostRaw == null) {
    throw new BadRequestException(
      `Missing unitCost for VARIANT. Set TownProductVariant.unitCost (preferred) or TownProduct.costPerUnit. TownProduct=${tp.id}, Variant=${variantId}`,
    );
  }

  const unitPrice = new Prisma.Decimal(item.unitPrice); // variant unit price stored on item
  const unitCost = new Prisma.Decimal(unitCostRaw);     // per unit (variant)
  const cogs = unitCost.mul(qty);
  const profit = revenue.sub(cogs);

  await tx.saleItem.upsert({
    where: { orderItemId: item.id },
    create: {
      saleId: sale.id,
      orderItemId: item.id,
      townProductId: item.townProductId,
      quantity: qty,
      weightGrams: null,
      unitPrice,
      revenue,
      unitCost,
      cogs,
      profit,
    },
    update: {
      saleId: sale.id,
      townProductId: item.townProductId,
      quantity: qty,
      weightGrams: null,
      unitPrice,
      revenue,
      unitCost,
      cogs,
      profit,
    },
  });

  continue;
}
      if (tp.pricingModel === PricingModel.WEIGHT) {
        const grams = item.weightGrams ?? 0;
        if (grams < 1) {
          throw new BadRequestException(
            `WEIGHT item missing weightGrams: ${item.id}`,
          );
        }
        if (tp.costPerKg == null) {
          throw new BadRequestException(
            `Missing costPerKg for TownProduct ${tp.id}`,
          );
        }

        const unitPrice = new Prisma.Decimal(item.unitPrice); // per kg
        const unitCost = new Prisma.Decimal(tp.costPerKg); // per kg
        const kg = new Prisma.Decimal(grams).div(1000);

        const cogs = unitCost.mul(kg);
        const profit = revenue.sub(cogs);

        await tx.saleItem.upsert({
          where: { orderItemId: item.id },
          create: {
            saleId: sale.id,
            orderItemId: item.id,
            townProductId: item.townProductId,
            quantity: null,
            weightGrams: grams,
            unitPrice,
            revenue,
            unitCost,
            cogs,
            profit,
          },
          update: {
            saleId: sale.id,
            townProductId: item.townProductId,
            quantity: null,
            weightGrams: grams,
            unitPrice,
            revenue,
            unitCost,
            cogs,
            profit,
          },
        });

        continue;
      }

      throw new BadRequestException(
        `Unsupported pricingModel for TownProduct ${tp.id}`,
      );
    }

    return tx.sale.findUnique({
      where: { orderId },
      include: { items: true },
    });
  }

  async devRebuildSale(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });

    if (!order) throw new NotFoundException(`Order not found: ${orderId}`);

    if (
      order.status !== OrderStatus.FULFILLED &&
      order.status !== OrderStatus.SETTLED
    ) {
      throw new BadRequestException(
        'Sale can only be rebuilt after delivery (FULFILLED) or after settlement (SETTLED)',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await this.createSaleForDeliveredOrder(tx, orderId);

      return tx.sale.findUnique({
        where: { orderId },
        include: { items: true },
      });
    });
  }

  async completeOrder(orderId: string, code: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new NotFoundException(`Order not found: ${orderId}`);

    if (
      order.status === OrderStatus.FULFILLED ||
      order.status === OrderStatus.SETTLED
    ) {
      return order;
    }

    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('Order can only be completed from CONFIRMED');
    }

    if (!order.deliveryCodeHash) {
      throw new BadRequestException('Delivery code is not set for this order');
    }

    if (
      order.deliveryCodeExpiresAt &&
      order.deliveryCodeExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Delivery code has expired');
    }

    const incomingHash = this.hashCode(code);

    if (incomingHash !== order.deliveryCodeHash) {
      throw new BadRequestException('Invalid delivery code');
    }

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();

      const claimed = await tx.order.updateMany({
        where: {
          id: orderId,
          status: { in: [OrderStatus.CONFIRMED] },
          deliveryCodeHash: incomingHash,
          OR: [
            { deliveryCodeExpiresAt: null },
            { deliveryCodeExpiresAt: { gte: now } },
          ],
        },
        data: {
          status: OrderStatus.FULFILLED,
          deliveryCodeHash: null,
          deliveryCodeExpiresAt: null,
        },
      });

      if (claimed.count !== 1) {
        const current = await tx.order.findUnique({
          where: { id: orderId },
          select: {
            status: true,
            deliveryCodeHash: true,
            deliveryCodeExpiresAt: true,
          },
        });

        if (!current)
          throw new NotFoundException(`Order not found: ${orderId}`);

        if (
          current.status === OrderStatus.FULFILLED ||
          current.status === OrderStatus.SETTLED
        ) {
          return tx.order.findUnique({ where: { id: orderId } });
        }

        if (!current.deliveryCodeHash) {
          throw new BadRequestException(
            'Delivery code is not set for this order',
          );
        }

        if (
          current.deliveryCodeExpiresAt &&
          current.deliveryCodeExpiresAt.getTime() < Date.now()
        ) {
          throw new BadRequestException('Delivery code has expired');
        }

        if (current.deliveryCodeHash !== incomingHash) {
          throw new BadRequestException('Invalid delivery code');
        }

        throw new BadRequestException(
          'Order can only be completed from CONFIRMED',
        );
      }

      await this.deductStockForFulfilment(tx, orderId);
      await this.createSaleForDeliveredOrder(tx, orderId);

      return tx.order.findUnique({ where: { id: orderId } });
    });
  }

  async markCodCollected(orderId: string, note?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) throw new NotFoundException(`Order not found: ${orderId}`);

    if (order.status === OrderStatus.SETTLED) {
      throw new BadRequestException('Order is already settled');
    }

    const existing = order.payments.find(
      (p) => p.purpose === PaymentPurpose.COD_GOODS,
    );
    if (existing?.status === PaymentStatus.SUCCESS) {
      throw new BadRequestException('COD already marked as collected');
    }

    if (order.status !== OrderStatus.FULFILLED) {
      throw new BadRequestException(
        'COD can only be collected after delivery (FULFILLED)',
      );
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

  async cancelOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Order not found: ${id}`);
    }

    if (
      order.status !== OrderStatus.DRAFT &&
      order.status !== OrderStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        'Only DRAFT or CONFIRMED orders can be cancelled',
      );
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
    });
  }

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

    const existing = order.payments.find(
      (p) => p.purpose === PaymentPurpose.COD_GOODS,
    );

    if (existing?.status === PaymentStatus.SUCCESS) {
      throw new BadRequestException('Goods payment is already marked as paid');
    }

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

    const amountStr = new Prisma.Decimal(order.payOnDeliveryTotal).toFixed(2);

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
private async recalculateTotalsTx(
  tx: Prisma.TransactionClient,
  orderId: string,
) {
  const [items, order] = await Promise.all([
    tx.orderItem.findMany({ where: { orderId } }),
    tx.order.findUnique({ where: { id: orderId } }),
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

  await tx.order.update({
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