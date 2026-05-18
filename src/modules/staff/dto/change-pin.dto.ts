import { IsString, Length } from 'class-validator';

export class ChangePinDto {
  @IsString()
  @Length(4, 4)
  pin: string;
}