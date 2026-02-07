import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ProfitReportQueryDto {
  @IsOptional()
  @IsString()
  townId?: string;

  @IsOptional()
  @IsString()
  townProductId?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  // IMPORTANT: convert querystring "5" -> number 5
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @IsIn(['UNIT', 'WEIGHT'])
  pricingModel?: 'UNIT' | 'WEIGHT';
}
