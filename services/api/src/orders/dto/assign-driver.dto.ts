import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AssignDriverDto {
  @IsString()
  @IsNotEmpty()
  driverName!: string;

  @IsString()
  @IsNotEmpty()
  driverPhone!: string;

  @IsOptional()
  @IsString()
  note?: string;
}
