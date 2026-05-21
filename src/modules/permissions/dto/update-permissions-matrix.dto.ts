import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IsString, IsBoolean } from 'class-validator';

export class PermissionRowDto {
  @IsString()
  perm: string;

  @IsBoolean()
  admin: boolean;

  @IsBoolean()
  empleado: boolean;
}

export class UpdatePermissionsMatrixDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionRowDto)
  rows: PermissionRowDto[];
}
