import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Response } from 'express';
import { ReportsService, ReportType } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get(':type/excel')
  @RequirePermission('reports.read')
  async getExcel(
    @Param('type') type: ReportType,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const table = await this.service.buildTable(type, from, to);
    const buf = await this.service.toExcel(table);
    const filename = `${type}-${stamp()}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(buf.length));
    res.end(buf);
  }

  @Get(':type/pdf')
  @RequirePermission('reports.read')
  async getPdf(
    @Param('type') type: ReportType,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const table = await this.service.buildTable(type, from, to);
    const buf = await this.service.toPdf(table);
    const filename = `${type}-${stamp()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(buf.length));
    res.end(buf);
  }
}

function stamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}
