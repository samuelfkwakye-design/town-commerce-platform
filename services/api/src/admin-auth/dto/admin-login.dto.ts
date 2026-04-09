import { IsNotEmpty, IsString } from 'class-validator';

export class AdminLoginDto {
  @IsString()
  @IsNotEmpty()
  login!: string; // email or username

  @IsString()
  @IsNotEmpty()
  password!: string;
}
