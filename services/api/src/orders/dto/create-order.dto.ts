import {
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class CreateOrderItemDto {
  @IsString()
  townProductId!: string;

  // UNIT / VARIANT
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  // WEIGHT
  @IsOptional()
  @IsInt()
  @Min(1)
  weightGrams?: number;

  // VARIANT only
  @IsOptional()
  @IsString()
  townProductVariantId?: string;
}

export class CreateOrderDto {
  @IsString()
  townId!: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string | null;

  @IsOptional()
  @IsString()
  customerPhone?: string | null;

  @IsOptional()
  goodsPaymentMethod?: PaymentMethod;

  // ✅ NEW: order items at creation time
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}