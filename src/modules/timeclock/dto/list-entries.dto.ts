import { IsOptional, IsString, IsDateString } from 'class-validator';

export class ListTimeEntriesDto {
  @IsOptional() @IsString()
  userId?: string;

  @IsOptional() @IsDateString()
  from?: string;

  @IsOptional() @IsDateString()
  to?: string;
}