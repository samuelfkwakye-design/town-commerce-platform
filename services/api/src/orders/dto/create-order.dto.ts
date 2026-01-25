import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreateOrderDto {
  @IsString()
  townId: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  goodsPaymentMethod?: PaymentMethod; // COD (default) or MOMO
}
