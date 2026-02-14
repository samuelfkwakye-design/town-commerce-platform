import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RefundLeaderboardQueryDto {
  @IsOptional()
  @IsString()
  townId?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  // ISO date strings (or anything Date() can parse)
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  // Sorting metric
  @IsOptional()
  @IsIn(['refundedRevenue', 'refundItemsCount', 'nonRestockedCost'])
  metric?: 'refundedRevenue' | 'refundItemsCount' | 'nonRestockedCost';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
