import { IsOptional, IsEnum, IsString } from 'class-validator';
import { Role, UserStatus } from '../../../common/enums';

export class ListUsersDto {
  @IsOptional() @IsEnum(Role)
  role?: Role;

  @IsOptional() @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional() @IsString()
  search?: string;
}