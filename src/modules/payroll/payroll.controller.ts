import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PayrollQueryDto } from './dto/payroll-query.dto';

@Controller('payroll')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  @Get()
  @RequirePermission('payroll.read')
  calculate(@Query() query: PayrollQueryDto) {
    return this.service.calculate(query.month, query.period ?? 'month');
  }
}