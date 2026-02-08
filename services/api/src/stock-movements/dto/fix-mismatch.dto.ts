import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class FixMismatchDto {
  @IsString()
  @IsNotEmpty()
  townProductId!: string;

  @IsString()
  @IsOptional()
  note?: string;
}
