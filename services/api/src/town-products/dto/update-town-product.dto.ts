import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateTownProductDto {
  @IsOptional()
  @IsEnum(['UNIT', 'WEIGHT'])
  pricingModel?: 'UNIT' | 'WEIGHT';

  @IsOptional()
  pricePerUnit?: string | number;

  @IsOptional()
  pricePerKg?: string | number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockQty?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockWeightGrams?: number;

  @IsOptional()
  isActive?: boolean;
}
