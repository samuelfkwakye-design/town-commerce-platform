import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CloneTownCatalogDto {
  @IsString()
  sourceTownId!: string;

  @IsOptional()
  @IsBoolean()
  copyVariants?: boolean;

  @IsOptional()
  @IsBoolean()
  copyImages?: boolean;

  @IsOptional()
  @IsBoolean()
  copyStock?: boolean;
}
