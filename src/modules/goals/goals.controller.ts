import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user.type';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(private readonly service: GoalsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('progress')
  getProgress(@CurrentUser() user: AuthUser, @Query('userId') userId?: string) {
    return this.service.getProgress(userId === 'me' || !userId ? user.id : userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermission('bonuses.manage')
  create(@Body() dto: CreateGoalDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission('bonuses.manage')
  update(@Param('id') id: string, @Body() dto: UpdateGoalDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('bonuses.manage')
  remove(@Param('id') id: string) {
    return this.service.softDelete(id);
  }
}