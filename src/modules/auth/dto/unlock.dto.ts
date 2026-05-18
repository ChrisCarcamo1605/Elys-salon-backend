import { IsString, Length } from 'class-validator';

export class UnlockDto {
  @IsString()
  @Length(4, 4)
  pin: string;
}