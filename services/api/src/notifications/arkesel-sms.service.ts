import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ArkeselSmsService {
  private readonly logger = new Logger(ArkeselSmsService.name);
  private readonly apiKey = process.env.ARKESEL_API_KEY || '';
  private readonly senderId = process.env.ARKESEL_SENDER_ID || 'KOSTOMA';
  private readonly endpoint = 'https://sms.arkesel.com/api/v2/sms/send';

  private normalizePhone(raw?: string | null): string {
    const digits = String(raw ?? '').replace(/\D/g, '');

    if (!digits) return '';

    if (digits.startsWith('233') && digits.length >= 12) {
      return digits;
    }

    if (digits.startsWith('0') && digits.length === 10) {
      return `233${digits.slice(1)}`;
    }

    if (digits.length === 9) {
      return `233${digits}`;
    }

    return digits;
  }

  async sendSms(to: string, message: string) {
    if (!this.apiKey) {
      this.logger.warn('ARKESEL_API_KEY is missing. SMS not sent.');
      return { ok: false, reason: 'missing_api_key' };
    }

    const phone = this.normalizePhone(to);

    if (!phone) {
      this.logger.warn(`Invalid phone number: ${to}`);
      return { ok: false, reason: 'invalid_phone' };
    }

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify({
          sender: this.senderId,
          message,
          recipients: [phone],
        }),
      });

      const bodyText = await response.text();

      if (!response.ok) {
        this.logger.error(
          `Arkesel SMS failed (${response.status}): ${bodyText}`,
        );
        return {
          ok: false,
          status: response.status,
          body: bodyText,
        };
      }

      this.logger.log(`SMS sent to ${phone}`);
      return {
        ok: true,
        status: response.status,
        body: bodyText,
      };
    } catch (error) {
      this.logger.error(
        `Arkesel SMS request failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return {
        ok: false,
        reason: 'request_failed',
      };
    }
  }
}
