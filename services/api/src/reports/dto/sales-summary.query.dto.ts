import { IsOptional, IsString } from 'class-validator';

export class SalesSummaryQueryDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  townId?: string;
}
