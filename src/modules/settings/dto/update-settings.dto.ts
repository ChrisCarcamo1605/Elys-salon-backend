import { IsString, IsObject, IsOptional } from 'class-validator';

export class UpdateSettingsDto {
  @IsString()
  key: string;

  @IsObject()
  value: Record<string, unknown>;
}