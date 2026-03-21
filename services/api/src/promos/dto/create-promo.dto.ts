import {
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
} from 'class-validator';

import { PromoType } from '@prisma/client';

export class CreatePromoDto {
  @IsString()
  code!: string;

  @IsEnum(PromoType)
  type!: PromoType;

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsString()
  townId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  expiresAt?: Date;
}