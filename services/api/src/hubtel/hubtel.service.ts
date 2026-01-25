import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export type HubtelReceiveMoneyRequest = {
  destination: string; // momo phone
  amount: string; // e.g. "120.00"
  clientReference: string;
  callbackUrl: string;
  description?: string;
};

export type HubtelReceiveMoneyResult = {
  configured: boolean;
  ok: boolean;
  status: number;
  clientReference: string;
  transactionId?: string | null;
  providerStatus?: string | null;
  json: any;
  raw?: string | null;
  error?: string | null;
  meta?: any;
};

@Injectable()
export class HubtelService {
  constructor(private readonly http: HttpService) {}

  /* ─────────────── ENV HELPERS ─────────────── */

  private get clientId(): string {
    return (process.env.HUBTEL_CLIENT_ID ?? '').trim();
  }

  private get clientSecret(): string {
    return (process.env.HUBTEL_CLIENT_SECRET ?? '').trim();
  }

  private get receiveMoneyUrl(): string {
    return (process.env.HUBTEL_RECEIVE_MONEY_URL ?? '').trim();
  }

  private basicAuthHeader(): string {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    return `Basic ${auth}`;
  }

  private isPlaceholder(v: string): boolean {
    const x = (v ?? '').trim().toLowerCase();
    return (
      !x ||
      x === 'your_client_id' ||
      x === 'your_client_secret' ||
      x.includes('<your_') ||
      x.includes('placeholder')
    );
  }

  /* ─────────────── RECEIVE MONEY ─────────────── */

  /**
   * DEV-SAFE implementation
   * - Does NOT throw if Hubtel is not configured
   * - Returns structured diagnostics instead
   */
  async receiveMoney(
    req: HubtelReceiveMoneyRequest,
  ): Promise<HubtelReceiveMoneyResult> {
    const configured =
      !this.isPlaceholder(this.clientId) &&
      !this.isPlaceholder(this.clientSecret) &&
      !this.isPlaceholder(this.receiveMoneyUrl);

    // 🚫 Not configured yet → safe return
    if (!configured) {
      return {
        configured: false,
        ok: false,
        status: 0,
        clientReference: req.clientReference,
        transactionId: null,
        providerStatus: null,
        json: null,
        raw: null,
        error:
          'Hubtel not configured (missing/placeholder HUBTEL_CLIENT_ID / HUBTEL_CLIENT_SECRET / HUBTEL_RECEIVE_MONEY_URL)',
        meta: {
          destination: req.destination,
          amount: req.amount,
          callbackUrl: req.callbackUrl,
          description: req.description ?? null,
        },
      };
    }

    // Conservative payload (Hubtel variants handled server-side)
    const payload = {
      Destination: req.destination,
      Amount: Number(req.amount),
      CallbackUrl: req.callbackUrl,
      ClientReference: req.clientReference,
      Description: req.description ?? 'Goods payment',
    };

    try {
      const response = await firstValueFrom(
        this.http.post(this.receiveMoneyUrl, payload, {
          headers: {
            Authorization: this.basicAuthHeader(),
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          timeout: 15_000,
          // allow non-2xx so we can read body
          validateStatus: () => true,
        }),
      );

      const data = response.data ?? null;

      // Extract common Hubtel fields defensively
      const transactionId =
        data?.TransactionId ??
        data?.transactionId ??
        data?.Data?.TransactionId ??
        data?.data?.transactionId ??
        null;

      const providerStatus =
        data?.Status ??
        data?.status ??
        data?.Data?.Status ??
        data?.data?.status ??
        null;

      return {
        configured: true,
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        clientReference: req.clientReference,
        transactionId,
        providerStatus,
        json: data,
        raw: typeof data === 'string' ? data : null,
      };
    } catch (e: any) {
      return {
        configured: true,
        ok: false,
        status: 0,
        clientReference: req.clientReference,
        transactionId: null,
        providerStatus: null,
        json: null,
        raw: null,
        error: e?.message ?? 'Hubtel request failed',
      };
    }
  }
}
