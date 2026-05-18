import { IsOptional, IsString, IsDateString, IsIn } from 'class-validator';

export class ListTimeEntriesDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  @IsIn(['week', 'month', 'year'])
  range?: string;
}
