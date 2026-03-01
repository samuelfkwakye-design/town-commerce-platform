
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class OpsDashboardQueryDto {
  @IsOptional()
  @IsString()
  townId?: string;

  /**
   * Orders that have been CONFIRMED longer than this threshold count as "stale".
   * Default: 2 hours
   */
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(72)
  confirmedStaleHours?: number;
}