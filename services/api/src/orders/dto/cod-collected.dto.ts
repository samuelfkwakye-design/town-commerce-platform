import { IsOptional, IsString } from 'class-validator';

export class CodCollectedDto {
  @IsOptional()
  @IsString()
  note?: string;
}
