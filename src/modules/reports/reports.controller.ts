import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Response } from 'express';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  @Get(':type/excel')
  @RequirePermission('reports.read')
  async getExcel(@Param('type') type: string, @Query('from') from: string, @Query('to') to: string, @Res() res: Response) {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Reportes Excel aún no implementados' } });
  }

  @Get(':type/pdf')
  @RequirePermission('reports.read')
  async getPdf(@Param('type') type: string, @Query('from') from: string, @Query('to') to: string, @Res() res: Response) {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Reportes PDF aún no implementados' } });
  }
}