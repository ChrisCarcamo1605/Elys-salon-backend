import { IsObject, IsOptional, IsEnum } from 'class-validator';
import { Role } from '../../../common/enums';

export class UpdatePermissionsDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsObject()
  permissions: Record<string, boolean>;
}
