import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BranchesService } from './branches.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user.type';
import { Role } from '../../common/enums';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Controller('branches')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BranchesController {
  constructor(private readonly service: BranchesService) {}

  @Get()
  @RequirePermission('branches.read')
  findAll(@CurrentUser() user: AuthUser) {
    return this.service.findAll(
      user.role === Role.ADMIN ? undefined : (user.branchId ?? undefined),
    );
  }

  @Post()
  @RequirePermission('branches.write')
  create(@Body() dto: CreateBranchDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission('branches.write')
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.service.update(id, dto);
  }
}
