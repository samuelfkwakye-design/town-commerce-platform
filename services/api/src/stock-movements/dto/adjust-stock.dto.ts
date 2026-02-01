import { IsInt, IsOptional, IsString, MinLength, NotEquals } from 'class-validator';

export class AdjustStockDto {
  @IsString()
  townProductId!: string;

  // For UNIT products (can be negative or positive)
  @IsOptional()
  @IsInt()
  @NotEquals(0)
  deltaQty?: number;

  // For WEIGHT products (grams; can be negative or positive)
  @IsOptional()
  @IsInt()
  @NotEquals(0)
  deltaWeightGrams?: number;

  @IsString()
  @MinLength(3)
  note!: string;
}
