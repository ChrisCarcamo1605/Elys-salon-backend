import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TimeclockService } from './timeclock.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user.type';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { ListTimeEntriesDto } from './dto/list-entries.dto';
import { SummaryDto } from './dto/summary.dto';

@Controller('timeclock')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TimeclockController {
  constructor(private readonly service: TimeclockService) {}

  @Post('punch-in')
  punchIn(@CurrentUser() user: AuthUser) {
    return this.service.punchIn(user.id);
  }

  @Post('punch-out')
  punchOut(@CurrentUser() user: AuthUser) {
    return this.service.punchOut(user.id);
  }

  @Get('today')
  getToday(@CurrentUser() user: AuthUser) {
    return this.service
      .getToday(user.id, user.role)
      .then((entries) => ({ entries }));
  }

  @Get('history')
  @RequirePermission('attendance.read_all')
  getHistory(@Query() query: ListTimeEntriesDto) {
    return this.service.getHistory(query);
  }

  @Patch('entries/:id')
  @RequirePermission('attendance.read_all')
  updateEntry(
    @Param('id') id: string,
    @Body() dto: UpdateEntryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateEntry(id, dto, user.id);
  }

  @Get('summary')
  getSummary(@Query() query: SummaryDto, @CurrentUser() user: AuthUser) {
    return this.service.getSummary(
      query.range,
      user.role === 'admin' ? undefined : user.id,
    );
  }
}
