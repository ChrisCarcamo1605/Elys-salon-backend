import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { UpdatePermissionsMatrixDto } from './dto/update-permissions-matrix.dto';

@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly service: PermissionsService) {}

  @Get()
  @RequirePermission('users.permissions.manage')
  getMatrix() {
    return this.service.getMatrix();
  }

  @Put()
  @RequirePermission('users.permissions.manage')
  updateMatrix(@Body() dto: UpdatePermissionsMatrixDto) {
    return this.service.upsertMatrix(dto.rows);
  }
}