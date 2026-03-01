import { IsIn, IsOptional, IsString } from 'class-validator';

export class SalesTimeseriesQueryDto {
  @IsOptional()
  @IsString()
  from?: string; // ISO date

  @IsOptional()
  @IsString()
  to?: string; // ISO date

  @IsOptional()
  @IsString()
  townId?: string;

  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  bucket?: 'day' | 'week' | 'month' = 'day';
}
