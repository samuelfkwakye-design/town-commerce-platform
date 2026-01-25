import { IsOptional, IsString } from 'class-validator';

export class PayGoodsDto {
  // Optional override if you want to pay to a different number than order.customerPhone
  @IsOptional()
  @IsString()
  momoPhone?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
