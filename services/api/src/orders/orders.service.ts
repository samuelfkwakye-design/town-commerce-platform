import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  PricingModel,
} from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { HubtelService } from '../hubtel/hubtel.service';

import { AddOrderItemDto } from './dto/add-order-item.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hubtel: HubtelService,
  ) {}

  private dec(value: string | number): Prisma.Decimal {
    return new Prisma.Decimal(String(value));
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

  async addItem(orderId: string, dto: AddOrderItemDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order not found: ${orderId}`);

    if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException('You can only add items to a DRAFT order');
    }

    const townProduct = await this.prisma.townProduct.findUnique({
      where: { id: dto.townProductId },
      include: { product: true, town: true },
    });

    if (!townProduct) throw new NotFoundException(`TownProduct not found: ${dto.townProductId}`);

    if (townProduct.townId !== order.townId) {
      throw new BadRequestException('TownProduct does not belong to this order’s town');
    }

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
      include: { items: { include: { townProduct: true } } },
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

        if (tp.stockQty === null || tp.stockQty === undefined) continue;

        const updated = await tx.townProduct.updateMany({
          where: { id: tp.id, stockQty: { not: null, gte: qty } },
          data: { stockQty: { decrement: qty } },
        });

        if (updated.count !== 1) {
          throw new BadRequestException(`Insufficient stock for townProduct ${tp.id}`);
        }
        continue;
      }

      if (tp.pricingModel === PricingModel.WEIGHT) {
        const grams = item.weightGrams ?? 0;
        if (grams < 1) throw new BadRequestException('WEIGHT item missing weightGrams');

        if (tp.stockWeightGrams === null || tp.stockWeightGrams === undefined) continue;

        const updated = await tx.townProduct.updateMany({
          where: { id: tp.id, stockWeightGrams: { not: null, gte: grams } },
          data: { stockWeightGrams: { decrement: grams } },
        });

        if (updated.count !== 1) {
          throw new BadRequestException(`Insufficient stock (grams) for townProduct ${tp.id}`);
        }
      }
    }
  }

  async completeOrder(orderId: string, code: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order not found: ${orderId}`);

    // Idempotent: do not double-deduct
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
        where: { orderId_purpose: { orderId, purpose: PaymentPurpose.COD_GOODS } },
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
      existing?.clientReference ?? `goods_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

    const payment = await this.prisma.payment.upsert({
      where: { orderId_purpose: { orderId: order.id, purpose: PaymentPurpose.COD_GOODS } },
      create: {
        orderId: order.id,
        purpose: PaymentPurpose.COD_GOODS,
        method: PaymentMethod.MOMO,
        status: PaymentStatus.INITIATED,
        amount: order.payOnDeliveryTotal,
        currency: 'GHS',
        provider: 'HUBTEL',
        clientReference,
        hubtelResponse: { stage: 'INITIATED_LOCAL', payToPhone, note: note ?? null },
      },
      update: {
        method: PaymentMethod.MOMO,
        status: PaymentStatus.INITIATED,
        provider: 'HUBTEL',
        clientReference,
        hubtelResponse: { stage: 'INITIATED_LOCAL', payToPhone, note: note ?? null },
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
