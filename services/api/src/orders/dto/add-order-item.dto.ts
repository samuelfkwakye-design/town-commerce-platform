import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AddOrderItemDto {
  @IsString()
  townProductId!: string;

  // UNIT / VARIANT
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  // WEIGHT
  @IsOptional()
  @IsInt()
  @Min(1)
  weightGrams?: number;

  // VARIANT only
  @IsOptional()
  @IsString()
  townProductVariantId?: string;
}