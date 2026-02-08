import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class DevLedgerOnlyDto {
  @IsString()
  @IsNotEmpty()
  townProductId!: string;

  // Only allow manual adjustment in dev drift tool (safer)
  @IsString()
  @IsIn(['MANUAL_ADJUSTMENT'])
  reason!: 'MANUAL_ADJUSTMENT';

  @ValidateIf((o) => o.deltaWeightGrams == null)
  @IsInt()
  deltaQty?: number;

  @ValidateIf((o) => o.deltaQty == null)
  @IsInt()
  deltaWeightGrams?: number;

  @IsString()
  @IsOptional()
  note?: string;
}
