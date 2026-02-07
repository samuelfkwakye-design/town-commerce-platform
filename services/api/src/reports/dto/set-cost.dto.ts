import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SetCostDto {
  @IsString()
  townProductId!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costPerUnit?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costPerKg?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
