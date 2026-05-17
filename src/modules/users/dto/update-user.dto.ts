import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { RoleName } from '../../../common/enums';

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @ApiPropertyOptional({ enum: RoleName })
  @IsOptional()
  @IsEnum(RoleName)
  role?: RoleName;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ResetPasswordDto {
  @ApiPropertyOptional({ minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class GrantPermissionDto {
  @ApiPropertyOptional({ description: 'Código del permiso (recurso.accion)' })
  @IsString()
  permissionCode!: string;
}
