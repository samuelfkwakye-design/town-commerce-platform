import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class AdminTownProductImageInputDto {
  @IsUrl()
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  alt?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class AdminAddTownProductImagesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AdminTownProductImageInputDto)
  images!: AdminTownProductImageInputDto[];
}
