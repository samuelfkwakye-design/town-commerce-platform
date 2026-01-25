import { IsString } from 'class-validator';

export class GetPaymentStatusDto {
  @IsString()
  clientReference!: string;
}
