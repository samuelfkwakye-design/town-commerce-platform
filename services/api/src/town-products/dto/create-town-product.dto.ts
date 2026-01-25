import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateTownProductDto {
  @IsString()
  townId: string;

  @IsString()
  productId: string;

  @IsEnum(['UNIT', 'WEIGHT'])
  pricingModel: 'UNIT' | 'WEIGHT';

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
