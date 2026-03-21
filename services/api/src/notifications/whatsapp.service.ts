import { Injectable, Logger } from '@nestjs/common';

type SendOrderWhatsappInput = {
  phoneNumber: string;
  orderId: string;
  totalAmount: number | string;
  paymentMethod?: string | null;
  townSlug?: string | null;
};

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  async sendOrderConfirmation(input: SendOrderWhatsappInput): Promise<void> {
    const { phoneNumber, orderId, totalAmount, paymentMethod, townSlug } = input;

    const safePhone = this.normalizePhoneNumber(phoneNumber);

    if (!safePhone) {
      this.logger.warn(
        `Skipping WhatsApp confirmation for order ${orderId}: no phone number`,
      );
      return;
    }

    const paymentLabel =
      paymentMethod === 'COD'
        ? 'Cash on delivery'
        : paymentMethod === 'MOMO'
          ? 'MoMo on delivery'
          : paymentMethod ?? 'Not specified';

    const trackingLink = this.buildTrackingLink(townSlug, orderId);

    const lines = [
      'Hello 👋',
      '',
      'Your order has been received.',
      '',
      `Order ID: ${orderId}`,
      `Total: GHS ${Number(totalAmount || 0).toFixed(2)}`,
      `Payment: ${paymentLabel}`,
      '',
      'We will begin reviewing and preparing your order shortly.',
      trackingLink ? '' : null,
      trackingLink ? `Track your order: ${trackingLink}` : null,
      '',
      'Thank you for shopping with us.',
    ].filter(Boolean);

    const message = lines.join('\n');

    // Phase 1: just log the message so the integration point is fully wired.
    // Later this can be replaced with Twilio or WhatsApp Cloud API.
    this.logger.log(
      `WhatsApp confirmation queued for ${safePhone}: ${message}`,
    );
  }

  private buildTrackingLink(
    townSlug?: string | null,
    orderId?: string | null,
  ): string | null {
    const baseUrl = (process.env.CUSTOMER_APP_BASE_URL ?? '').trim();

    if (!baseUrl || !townSlug || !orderId) return null;

    const cleanBase = baseUrl.replace(/\/+$/, '');
    return `${cleanBase}/${encodeURIComponent(townSlug)}/order/${encodeURIComponent(orderId)}`;
  }

  private normalizePhoneNumber(phoneNumber: string): string {
    const raw = String(phoneNumber || '').trim();

    if (!raw) return raw;
    if (raw.startsWith('+')) return raw;

    return raw;
  }
}