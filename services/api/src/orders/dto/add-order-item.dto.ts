import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AddOrderItemDto {
  @IsString()
  townProductId: string;

  // UNIT
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  // WEIGHT (grams)
  @IsOptional()
  @IsInt()
  @Min(1)
  weightGrams?: number;
}
