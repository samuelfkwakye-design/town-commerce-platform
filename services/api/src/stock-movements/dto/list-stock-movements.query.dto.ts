import { Transform } from 'class-transformer';
import { IsEnum, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';
import { StockMovementReason } from '@prisma/client';

export class ListStockMovementsQueryDto {
  @IsOptional()
  @IsString()
  townProductId?: string;

  @IsOptional()
  @IsEnum(StockMovementReason)
  reason?: StockMovementReason;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  refundId?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @Min(1)
  @Max(200)
  limit?: number;

  // Cursor format: `${createdAtISO}|${id}`
  @IsOptional()
  @IsString()
  cursor?: string;
}
