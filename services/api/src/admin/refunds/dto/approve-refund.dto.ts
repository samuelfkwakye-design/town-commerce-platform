export class ApproveRefundDto {
  /**
   * INTERNAL: no payout needed, ops adjustment only -> SUCCESS immediately
   * PAYOUT: payout needed -> stays REQUESTED until mark-paid
   */
  mode!: 'INTERNAL' | 'PAYOUT';

  // Only relevant when mode = PAYOUT
  payoutMethod?: 'MOMO' | 'CASH';

  note?: string;
}
