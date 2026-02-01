import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class RefundGoodsDto {
  @IsOptional()
  @IsString()
  reason?: string;

  // If true, stock will be put back when refund is SUCCESS (COD immediately, MOMO on manual completion)
  @IsOptional()
  @IsBoolean()
  restock?: boolean;
}
