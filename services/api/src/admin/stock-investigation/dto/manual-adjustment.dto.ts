export class ManualAdjustmentDto {
  // Signed integer. For UNIT products, this adjusts quantity by deltaQty.
  deltaQty?: number;

  // Signed integer grams. For WEIGHT products, this adjusts weight by deltaWeightGrams.
  deltaWeightGrams?: number;

  // Optional note shown in ops UI.
  note?: string;
}
