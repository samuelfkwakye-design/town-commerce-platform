import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetAdminPasswordDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}
