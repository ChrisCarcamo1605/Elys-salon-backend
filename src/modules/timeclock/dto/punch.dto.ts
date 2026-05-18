import { IsOptional, IsString } from 'class-validator';

export class PunchInDto {
  @IsOptional() @IsString()
  source?: string;
}