import { ArrayNotEmpty, IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class ApplyTownProductPricingDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  townIds!: string[];

  @IsOptional()
  @IsBoolean()
  includeCosts?: boolean;

  @IsOptional()
  @IsBoolean()
  applyVariants?: boolean;
}
