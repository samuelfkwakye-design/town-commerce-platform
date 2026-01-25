import { IsEmail, IsNumberString, IsOptional, IsString } from 'class-validator';

export class UpdateOrderDto {
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  // Fees (stored as decimals in DB, sent as strings like "15.00")
  @IsOptional()
  @IsNumberString()
  deliveryFee?: string;

  @IsOptional()
  @IsNumberString()
  serviceFee?: string;
}
