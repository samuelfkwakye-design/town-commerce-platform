import { IsArray, IsBoolean, IsOptional, IsString, ArrayNotEmpty } from 'class-validator';

export class CloneTownProductDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  townIds!: string[];

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
