import { IsDateString } from 'class-validator';

export class SnoozeAlertDto {
  @IsDateString()
  snoozedUntil: string;
}