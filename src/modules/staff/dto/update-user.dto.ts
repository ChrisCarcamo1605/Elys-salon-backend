import { PartialType, OmitType } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['pin'] as const)) {}

export class UpdatePinDto {
  @IsString()
  @Length(4, 4)
  pin: string;
}