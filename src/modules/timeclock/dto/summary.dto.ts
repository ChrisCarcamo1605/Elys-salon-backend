import { IsString, IsOptional } from 'class-validator';

export class SummaryDto {
  @IsString()
  range: 'week' | 'biweek' | 'month';

  @IsOptional()
  @IsString()
  userId?: string;
}
