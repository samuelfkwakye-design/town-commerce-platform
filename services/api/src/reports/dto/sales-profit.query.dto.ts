import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class SalesProfitQueryDto {
  @IsOptional()
  @IsString()
  from?: string; // ISO date string

  @IsOptional()
  @IsString()
  to?: string; // ISO date string

  @IsOptional()
  @IsString()
  townId?: string;

  @IsOptional()
  @IsString()
  townProductId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  onlyWithSales?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  grandTotals?: boolean;

}
