import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Max, Min } from 'class-validator';

export class StockValuationQueryDto {
  @IsOptional()
  @IsString()
  townId?: string;

  @IsOptional()
  @IsIn(['UNIT', 'WEIGHT'])
  pricingModel?: 'UNIT' | 'WEIGHT';

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : String(value).trim().toLowerCase() === 'true'))
  onlyMismatches?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string; // TownProduct.id
}
