import { IsObject } from 'class-validator';

export class UpdatePreferencesDto {
  @IsObject()
  value: Record<string, unknown>;
}
