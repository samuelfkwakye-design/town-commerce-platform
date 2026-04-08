import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateDriverDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsIn(['AVAILABLE', 'BUSY', 'OFFLINE'])
  availability?: 'AVAILABLE' | 'BUSY' | 'OFFLINE';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
