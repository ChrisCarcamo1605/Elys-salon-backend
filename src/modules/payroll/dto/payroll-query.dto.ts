import { IsString, IsOptional } from 'class-validator';

export class PayrollQueryDto {
  @IsString()
  month: string;

  @IsOptional() @IsString()
  period?: 'biweek' | 'month';
}