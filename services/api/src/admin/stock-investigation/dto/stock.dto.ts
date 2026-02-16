export type PricingModel = 'UNIT' | 'WEIGHT';

export type TownProductStockDto = {
  townProductId: string;

  townId: string;
  townName: string;
  townSlug: string;

  productId: string;
  productName: string;

  pricingModel: PricingModel;

  snapshotQty: number | null;
  snapshotWeightGrams: number | null;

  ledgerQty: number | null;
  ledgerWeightGrams: number | null;

  diffQty: number | null;
  diffWeightGrams: number | null;

  lastMovementAt: string | null;
  snapshotUpdatedAt: string | null;

  isMismatch: boolean;
};
