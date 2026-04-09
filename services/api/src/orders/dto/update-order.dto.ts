import {
  IsEmail,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateOrderDto {
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  deliveryRecipientName?: string;

  @IsOptional()
  @IsString()
  deliveryPhone?: string;

  @IsOptional()
  @IsString()
  deliveryLine1?: string;

  @IsOptional()
  @IsString()
  deliveryLine2?: string;

  @IsOptional()
  @IsString()
  deliveryArea?: string;

  @IsOptional()
  @IsString()
  deliveryTown?: string;

  @IsOptional()
  @IsString()
  deliveryLandmark?: string;

  @IsOptional()
  @IsString()
  deliveryNotes?: string;

  @IsOptional()
  @IsNumberString()
  deliveryFee?: string;

  @IsOptional()
  @IsNumberString()
  serviceFee?: string;
}