import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsObject,
  Length,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Role, UserStatus, PayType } from '../../../common/enums';

export class CreateUserDto {
  @IsString()
  @Length(2, 120)
  name: string;

  @IsString()
  @Length(4, 4)
  pin: string;

  @IsEnum(Role)
  role: Role;

  @IsOptional()
  @IsString()
  @Length(1, 4)
  initials?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsDateString()
  birthday?: string;

  @IsOptional()
  @IsObject()
  schedule?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(PayType)
  payType?: PayType;

  @IsOptional()
  @IsNumber()
  salary?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @IsOptional()
  @IsNumber()
  avatarHue?: number;
}
