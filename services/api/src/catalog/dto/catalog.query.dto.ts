import { IsOptional, IsString } from 'class-validator';

export class CatalogQueryDto {
  @IsString()
  townSlug!: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  categorySlug?: string;
}