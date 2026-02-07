import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Max, Min } from 'class-validator';

function toBool(value: any): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  const v = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(v)) return true;
  if (['false', '0', 'no', 'n'].includes(v)) return false;
  return undefined;
}

export class ReconcileStockQueryDto {
  @IsOptional()
  @IsString()
  townId?: string;

  @IsOptional()
  @IsString()
  townProductId?: string;

  // If true, only return rows where snapshot != ledger sum
  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  onlyMismatches?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @Min(1)
  @Max(200)
  limit?: number;

  // Cursor is townProductId (id ordering)
  @IsOptional()
  @IsString()
  cursor?: string;
}
