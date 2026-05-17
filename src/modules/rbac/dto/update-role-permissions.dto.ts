import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRolePermissionsDto {
  @ApiProperty({
    type: [String],
    description: 'Códigos de permisos (recurso.accion)',
  })
  @IsArray()
  @IsString({ each: true })
  permissionCodes!: string[];
}
