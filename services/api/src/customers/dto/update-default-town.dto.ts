import { IsOptional, IsString } from 'class-validator';

export class UpdateDefaultTownDto {
  @IsOptional()
  @IsString()
  defaultTownId?: string;
}
