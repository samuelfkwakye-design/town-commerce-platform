import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
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

export class CreateOrderPricingDto {
  @IsNumber()
  @Min(0)
  subtotal!: number;

  @IsNumber()
  @Min(0)
  serviceFee!: number;

  @IsNumber()
  @Min(0)
  deliveryFee!: number;

  @IsNumber()
  @Min(0)
  total!: number;

  @IsString()
  currency!: string;
}

export class CreateOrderDeliveryAddressDto {
  @IsString()
  recipientName!: string;

  @IsString()
  phone!: string;

  @IsString()
  line1!: string;

  @IsOptional()
  @IsString()
  line2?: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsString()
  town!: string;

  @IsOptional()
  @IsString()
  landmark?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateOrderDto {
  // old flow support
  @IsOptional()
  @IsString()
  townId?: string;

  // new storefront flow
  @IsOptional()
  @IsString()
  townSlug?: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string | null;

  @IsOptional()
  @IsString()
  customerPhone?: string | null;

  // new storefront naming
  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsEnum(PaymentMethod)
  goodsPaymentMethod?: PaymentMethod;

  // new storefront naming
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  promoCode?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateOrderPricingDto)
  pricing?: CreateOrderPricingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateOrderDeliveryAddressDto)
  deliveryAddress?: CreateOrderDeliveryAddressDto;

  @IsOptional()
  @IsString()
  customerAddressId?: string;
}