
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  phone!: string;

  @IsString()
  code!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}