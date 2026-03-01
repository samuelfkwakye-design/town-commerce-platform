export class MarkRefundPaidDto {
  payoutMethod?: 'MOMO' | 'CASH';
  payoutRef!: string; // momo txn id / cash receipt reference / bank ref
  note?: string;
}
