import { Injectable, Logger } from '@nestjs/common';
import { ArkeselSmsService } from './arkesel-sms.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly customerAppBaseUrl =
    (process.env.CUSTOMER_APP_BASE_URL || '').replace(/\/$/, '');

  constructor(private readonly sms: ArkeselSmsService) {}

  private money(value: unknown): string {
    const n =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value)
          : 0;

    return Number.isFinite(n) ? n.toFixed(2) : '0.00';
  }

  private buildOrderUrl(townSlug: string, orderId: string) {
    if (!this.customerAppBaseUrl) {
      return `/${townSlug}/order/${orderId}`;
    }
    return `${this.customerAppBaseUrl}/${townSlug}/order/${orderId}`;
  }

  private firstName(customerName?: string | null) {
    return customerName?.trim()?.split(/\s+/)[0] || 'Customer';
  }

  async sendOrderConfirmationSms(input: {
    phoneNumber?: string | null;
    orderId: string;
    totalAmount: number;
    townSlug?: string | null;
    currency?: string | null;
    customerName?: string | null;
  }) {
    const phone = String(input.phoneNumber ?? '').trim();
    if (!phone) {
      this.logger.warn(`No phone number for order ${input.orderId}. SMS skipped.`);
      return { ok: false, reason: 'missing_phone' };
    }

    const townSlug = input.townSlug || 'order';
    const currency = input.currency || 'GHS';
    const orderUrl = this.buildOrderUrl(townSlug, input.orderId);
    const firstName = this.firstName(input.customerName);

    const message =
      `Hi ${firstName},\n\n` +
      `Your Somame order is confirmed.\n` +
      `Ref: ${input.orderId}\n` +
      `Total: ${currency} ${this.money(input.totalAmount)}\n\n` +
      `Track order:\n${orderUrl}\n\n` +
      `Pay on delivery`;

    return this.sms.sendSms(phone, message);
  }

  async sendOrderAvailabilityConfirmedSms(input: {
    phoneNumber?: string | null;
    orderId: string;
    totalAmount: number;
    townSlug?: string | null;
    currency?: string | null;
    customerName?: string | null;
  }) {
    const phone = String(input.phoneNumber ?? '').trim();
    if (!phone) {
      this.logger.warn(
        `No phone number for availability-confirmed SMS on order ${input.orderId}. SMS skipped.`,
      );
      return { ok: false, reason: 'missing_phone' };
    }

    const townSlug = input.townSlug || 'order';
    const currency = input.currency || 'GHS';
    const orderUrl = this.buildOrderUrl(townSlug, input.orderId);
    const firstName = this.firstName(input.customerName);

    const message =
      `Hi ${firstName},\n\n` +
      `Your Somame order has been confirmed and is now being prepared.\n` +
      `Ref: ${input.orderId}\n` +
      `Total: ${currency} ${this.money(input.totalAmount)}\n\n` +
      `Track order:\n${orderUrl}\n\n` +
      `We will notify you again when your driver is assigned.`;

    return this.sms.sendSms(phone, message);
  }
  async sendDriverAssignedSms(input: {
  phoneNumber?: string | null;
  customerName?: string | null;
  driverName: string;
  driverPhone: string;
  orderId: string;
  townSlug?: string | null;
}) {
  const phone = String(input.phoneNumber ?? '').trim();
  if (!phone) return;

  const firstName =
    input.customerName?.split(' ')[0] || 'Customer';

  const message =
    `Hi ${firstName},\n\n` +
    `Your Somame order is on the way 🚚\n\n` +
    `Driver: ${input.driverName}\n` +
    `Phone: ${input.driverPhone}\n\n` +
    `Ref: ${input.orderId}`;

  return this.sms.sendSms(phone, message);
}
}