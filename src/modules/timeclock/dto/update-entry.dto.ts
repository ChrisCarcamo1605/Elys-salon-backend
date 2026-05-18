import { IsString, IsOptional } from 'class-validator';

export class UpdateEntryDto {
  @IsString()
  inAt: string;

  @IsOptional() @IsString()
  outAt?: string;
}