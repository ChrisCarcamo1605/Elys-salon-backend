import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../common/enums';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { RbacService } from './rbac.service';

@ApiTags('rbac')
@ApiBearerAuth()
@Controller()
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  @Get('roles')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  listRoles() {
    return this.rbac.listRoles();
  }

  @Get('permissions')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  listPermissions() {
    return this.rbac.listPermissions();
  }

  @Put('roles/:id/permissions')
  @Roles(RoleName.SYSTEM)
  updateRolePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.rbac.updateRolePermissions(id, dto.permissionCodes);
  }
}
