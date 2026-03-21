import {
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

class QuoteOrderItemDto {
  @IsString()
  townProductId!: string;

  @IsOptional()
  @IsString()
  townProductVariantId?: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  weightGrams?: number;
}

export class QuoteOrderDto {
  @IsString()
  townSlug!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteOrderItemDto)
  items!: QuoteOrderItemDto[];

  @IsOptional()
  @IsString()
  promoCode?: string;
}
