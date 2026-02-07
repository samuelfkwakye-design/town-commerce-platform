import { IsOptional, IsString } from 'class-validator';

export class BaselineFromSnapshotDto {
  // If provided, baseline only this TownProduct
  @IsOptional()
  @IsString()
  townProductId?: string;

  // If provided, baseline all TownProducts in this town
  @IsOptional()
  @IsString()
  townId?: string;

  // Optional note to store on StockMovement rows
  @IsOptional()
  @IsString()
  note?: string;
}
