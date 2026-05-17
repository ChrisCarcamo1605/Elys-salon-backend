import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../common/enums';
import { AuthUser } from '../../common/types/auth-user.type';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import {
  GrantPermissionDto,
  ResetPasswordDto,
  UpdateUserDto,
} from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @Roles(RoleName.ADMIN)
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Get()
  list(@Query() query: ListUsersDto) {
    return this.users.list(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.findById(id);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.deactivate(id);
  }

  @Post(':id/reset-password')
  @Roles(RoleName.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.users.resetPassword(id, dto.newPassword);
  }

  @Post(':id/permissions')
  @Roles(RoleName.ADMIN)
  grantPermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GrantPermissionDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.users.grantPermission(id, dto.permissionCode, currentUser.id);
  }

  @Delete(':id/permissions/:permId')
  @Roles(RoleName.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  revokePermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('permId', ParseUUIDPipe) permId: string,
  ) {
    return this.users.revokePermission(id, permId);
  }
}
