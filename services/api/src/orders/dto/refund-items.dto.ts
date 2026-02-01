import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class RefundItemLineDto {
  @IsString()
  orderItemId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  weightGrams?: number;
}

export class RefundItemsDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsBoolean()
  restock?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefundItemLineDto)
  items!: RefundItemLineDto[];
}
