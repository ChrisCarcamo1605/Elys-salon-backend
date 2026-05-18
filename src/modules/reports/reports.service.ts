import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Sale } from '../sales/entities/sale.entity';
import { SaleLine } from '../sales/entities/sale-line.entity';
import { CatalogItem } from '../catalog/entities/catalog-item.entity';
import { User } from '../staff/entities/user.entity';
import { TimeEntry } from '../timeclock/entities/time-entry.entity';
import { SaleStatus, UserStatus, ItemType } from '../../common/enums';
import { AppLogger } from '../../common/utils/logger';

export type ReportType =
  | 'sales'
  | 'inventory'
  | 'payroll'
  | 'attendance'
  | 'top-categories'
  | 'hours-worked'
  | 'executive';

interface ReportTable {
  title: string;
  subtitle?: string;
  columns: {
    header: string;
    key: string;
    width?: number;
    format?: 'money' | 'number' | 'date' | 'text';
  }[];
  rows: Record<string, unknown>[];
  totals?: { label: string; value: string | number }[];
}

@Injectable()
export class ReportsService {
  private readonly logger = new AppLogger(ReportsService.name);

  constructor(
    @InjectRepository(Sale) private saleRepo: Repository<Sale>,
    @InjectRepository(SaleLine) private lineRepo: Repository<SaleLine>,
    @InjectRepository(CatalogItem) private catalogRepo: Repository<CatalogItem>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(TimeEntry) private entryRepo: Repository<TimeEntry>,
  ) {}

  // ─── Dispatcher ────────────────────────────────────────────────────────────

  async buildTable(
    type: ReportType,
    from?: string,
    to?: string,
  ): Promise<ReportTable> {
    try {
      this.logger.infoWithContext('Building report', { type, from, to });
      const range = this.parseRange(from, to);
      let result: ReportTable;

      switch (type) {
        case 'sales':
          result = await this.salesReport(range);
          break;
        case 'inventory':
          result = await this.inventoryReport();
          break;
        case 'payroll':
          result = await this.payrollReport(range);
          break;
        case 'attendance':
          result = await this.attendanceReport(range);
          break;
        case 'top-categories':
          result = await this.topCategoriesReport(range);
          break;
        case 'hours-worked':
          result = await this.hoursWorkedReport(range);
          break;
        case 'executive':
          result = await this.executiveReport(range);
          break;
        default:
          this.logger.errorWithContext({
            message: 'Invalid report type',
            context: { type },
          });
          throw new BadRequestException(`Tipo de reporte inválido: ${type}`);
      }

      this.logger.infoWithContext('Report built successfully', {
        type,
        rowsCount: result.rows.length,
      });
      return result;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.errorWithContext({
        message: 'Failed to build report',
        error,
        context: { type, from, to },
      });
      throw error;
    }
  }

  // ─── Encoders: ReportTable → Excel / PDF ───────────────────────────────────

  async toExcel(table: ReportTable): Promise<Buffer> {
    try {
      this.logger.infoWithContext('Generating Excel report', {
        title: table.title,
      });
      const wb = new ExcelJS.Workbook();
      wb.creator = "Ely's Salón";
      wb.created = new Date();
      const ws = wb.addWorksheet(table.title.slice(0, 28));

      ws.mergeCells(1, 1, 1, Math.max(table.columns.length, 1));
      ws.getCell(1, 1).value = table.title;
      ws.getCell(1, 1).font = { size: 16, bold: true };
      if (table.subtitle) {
        ws.mergeCells(2, 1, 2, Math.max(table.columns.length, 1));
        ws.getCell(2, 1).value = table.subtitle;
        ws.getCell(2, 1).font = { italic: true, color: { argb: 'FF888888' } };
      }

      ws.addRow([]);
      const headerRow = ws.addRow(table.columns.map((c) => c.header));
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDE0FAB' },
      };
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

      table.columns.forEach((c, i) => {
        ws.getColumn(i + 1).width = c.width ?? 18;
      });

      for (const row of table.rows) {
        const values = table.columns.map((c) => row[c.key] ?? '');
        const r = ws.addRow(values);
        table.columns.forEach((c, i) => {
          const cell = r.getCell(i + 1);
          if (c.format === 'money') cell.numFmt = '"$"#,##0.00';
          if (c.format === 'number') cell.numFmt = '#,##0';
          if (c.format === 'date' && cell.value instanceof Date)
            cell.numFmt = 'yyyy-mm-dd';
        });
      }

      if (table.totals?.length) {
        ws.addRow([]);
        for (const t of table.totals) {
          const r = ws.addRow([t.label, t.value]);
          r.font = { bold: true };
        }
      }

      const buf = await wb.xlsx.writeBuffer();
      this.logger.infoWithContext('Excel report generated successfully', {
        title: table.title,
        rowsCount: table.rows.length,
      });
      return Buffer.from(buf);
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to generate Excel report',
        error,
        context: { title: table.title },
      });
      throw error;
    }
  }

  async toPdf(table: ReportTable): Promise<Buffer> {
    try {
      this.logger.infoWithContext('Generating PDF report', {
        title: table.title,
      });
      return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
          margin: 36,
          size: 'LETTER',
          layout: 'landscape',
        });
        const chunks: Buffer[] = [];
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => {
          this.logger.errorWithContext({
            message: 'PDF generation error',
            error: err,
            context: { title: table.title },
          });
          reject(err);
        });

        doc
          .fontSize(18)
          .fillColor('#DE0FAB')
          .text(table.title, { align: 'left' });
        doc.moveDown(0.2);
        if (table.subtitle) {
          doc.fontSize(10).fillColor('#666').text(table.subtitle);
        }
        doc.moveDown(0.6);

        const pageWidth =
          doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const colCount = table.columns.length;
        const colWidth = pageWidth / colCount;
        const startX = doc.page.margins.left;
        let y = doc.y;

        // Header row
        doc.fillColor('#000').fontSize(10).font('Helvetica-Bold');
        table.columns.forEach((c, i) => {
          doc
            .fillColor('#FFFFFF')
            .rect(startX + i * colWidth, y, colWidth, 20)
            .fill('#DE0FAB');
          doc
            .fillColor('#FFFFFF')
            .text(c.header, startX + i * colWidth + 4, y + 5, {
              width: colWidth - 8,
              lineBreak: false,
              ellipsis: true,
            });
        });
        y += 22;
        doc.font('Helvetica').fontSize(9).fillColor('#000');

        for (const row of table.rows) {
          if (y > doc.page.height - doc.page.margins.bottom - 30) {
            doc.addPage();
            y = doc.page.margins.top;
          }
          // Zebra
          if (table.rows.indexOf(row) % 2 === 1) {
            doc.fillColor('#F7F4FA').rect(startX, y, pageWidth, 18).fill();
          }
          doc.fillColor('#222');
          table.columns.forEach((c, i) => {
            const raw = row[c.key];
            const text = formatCell(raw, c.format);
            doc.text(text, startX + i * colWidth + 4, y + 4, {
              width: colWidth - 8,
              lineBreak: false,
              ellipsis: true,
            });
          });
          y += 18;
        }

        if (table.totals?.length) {
          y += 10;
          doc.font('Helvetica-Bold').fontSize(10).fillColor('#000');
          for (const t of table.totals) {
            if (y > doc.page.height - doc.page.margins.bottom - 20) {
              doc.addPage();
              y = doc.page.margins.top;
            }
            doc.text(`${t.label}: ${formatCell(t.value, 'text')}`, startX, y);
            y += 14;
          }
        }

        doc.end();
        this.logger.infoWithContext('PDF report generated successfully', {
          title: table.title,
          rowsCount: table.rows.length,
        });
      });
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to generate PDF report',
        error,
        context: { title: table.title },
      });
      throw error;
    }
  }

  // ─── Report builders ───────────────────────────────────────────────────────

  private async salesReport(r: DateRange): Promise<ReportTable> {
    const sales = await this.saleRepo.find({
      where: { createdAt: Between(r.from, r.to), status: SaleStatus.COMPLETED },
      relations: ['employee'],
      order: { createdAt: 'ASC' },
    });

    const rows = sales.map((s) => ({
      number: s.number,
      date: s.createdAt,
      employee: (s.employee as any)?.name ?? '—',
      subtotal: Number(s.subtotal),
      discount: Number(s.discountTotal),
      tip: Number(s.tip),
      total: Number(s.total),
    }));

    const totalGross = rows.reduce((a, x) => a + x.total, 0);
    const totalDisc = rows.reduce((a, x) => a + x.discount, 0);
    const totalTips = rows.reduce((a, x) => a + x.tip, 0);

    return {
      title: 'Ventas',
      subtitle: `${r.from.toISOString().slice(0, 10)} → ${r.to.toISOString().slice(0, 10)}`,
      columns: [
        { header: 'Ticket #', key: 'number', width: 12, format: 'number' },
        { header: 'Fecha', key: 'date', width: 22, format: 'date' },
        { header: 'Empleada', key: 'employee', width: 26 },
        { header: 'Subtotal', key: 'subtotal', width: 14, format: 'money' },
        { header: 'Descuento', key: 'discount', width: 14, format: 'money' },
        { header: 'Propina', key: 'tip', width: 12, format: 'money' },
        { header: 'Total', key: 'total', width: 14, format: 'money' },
      ],
      rows,
      totals: [
        { label: 'Total ventas', value: `$${totalGross.toFixed(2)}` },
        { label: 'Total descuentos', value: `$${totalDisc.toFixed(2)}` },
        { label: 'Total propinas', value: `$${totalTips.toFixed(2)}` },
        { label: 'Tickets', value: rows.length },
      ],
    };
  }

  private async inventoryReport(): Promise<ReportTable> {
    const items = await this.catalogRepo.find({
      where: { type: ItemType.PRODUCT, active: true },
      relations: ['category'],
      order: { name: 'ASC' },
    });

    const rows = items.map((p) => {
      const stock = p.stock ?? 0;
      const cost = Number(p.cost) || 0;
      return {
        name: p.name,
        sku: p.sku ?? '',
        category: (p as any).category?.label ?? '—',
        stock,
        stockMin: p.stockMin ?? 0,
        cost,
        price: Number(p.price),
        valueAtCost: stock * cost,
        valueAtPrice: stock * Number(p.price),
        low: stock < (p.stockMin ?? 3) ? 'Sí' : '',
      };
    });

    const totalCost = rows.reduce((a, x) => a + x.valueAtCost, 0);
    const totalPrice = rows.reduce((a, x) => a + x.valueAtPrice, 0);

    return {
      title: 'Inventario',
      subtitle: `Snapshot ${new Date().toISOString().slice(0, 10)}`,
      columns: [
        { header: 'Producto', key: 'name', width: 30 },
        { header: 'SKU', key: 'sku', width: 14 },
        { header: 'Categoría', key: 'category', width: 18 },
        { header: 'Stock', key: 'stock', width: 10, format: 'number' },
        { header: 'Mínimo', key: 'stockMin', width: 10, format: 'number' },
        { header: 'Costo', key: 'cost', width: 12, format: 'money' },
        { header: 'Precio', key: 'price', width: 12, format: 'money' },
        {
          header: 'Valor (costo)',
          key: 'valueAtCost',
          width: 14,
          format: 'money',
        },
        {
          header: 'Valor (venta)',
          key: 'valueAtPrice',
          width: 14,
          format: 'money',
        },
        { header: 'Bajo', key: 'low', width: 8 },
      ],
      rows,
      totals: [
        { label: 'Valor a costo', value: `$${totalCost.toFixed(2)}` },
        { label: 'Valor a venta', value: `$${totalPrice.toFixed(2)}` },
        { label: 'SKUs', value: rows.length },
      ],
    };
  }

  private async payrollReport(r: DateRange): Promise<ReportTable> {
    const employees = await this.userRepo.find({
      where: { status: UserStatus.ACTIVA },
    });
    const rows = [] as any[];
    let totalSales = 0;
    let totalCommissions = 0;
    let totalSalary = 0;
    let totalBonus = 0;

    for (const emp of employees) {
      const sales = await this.saleRepo.find({
        where: {
          employeeId: emp.id,
          createdAt: Between(r.from, r.to),
          status: SaleStatus.COMPLETED,
        },
      });
      const monthlySales = sales.reduce((sum, s) => sum + Number(s.total), 0);
      const salary = Number(emp.salary) || 0;
      const commissionRate = Number(emp.commissionRate) || 0;
      const commission = (monthlySales * commissionRate) / 100;
      let bonus = 0;
      if (monthlySales > 2000) bonus = 200;
      else if (monthlySales > 1500) bonus = 100;
      else if (monthlySales > 1000) bonus = 50;
      const total = salary + commission + bonus;

      totalSales += monthlySales;
      totalCommissions += commission;
      totalSalary += salary;
      totalBonus += bonus;

      rows.push({
        name: emp.name,
        role: emp.role,
        sales: monthlySales,
        salary,
        commissionRate,
        commission,
        bonus,
        total,
      });
    }

    return {
      title: 'Nómina',
      subtitle: `${r.from.toISOString().slice(0, 10)} → ${r.to.toISOString().slice(0, 10)}`,
      columns: [
        { header: 'Empleada', key: 'name', width: 26 },
        { header: 'Rol', key: 'role', width: 12 },
        { header: 'Ventas', key: 'sales', width: 14, format: 'money' },
        { header: 'Sueldo', key: 'salary', width: 14, format: 'money' },
        {
          header: '% Com.',
          key: 'commissionRate',
          width: 10,
          format: 'number',
        },
        { header: 'Comisión', key: 'commission', width: 14, format: 'money' },
        { header: 'Bono', key: 'bonus', width: 12, format: 'money' },
        { header: 'Total', key: 'total', width: 14, format: 'money' },
      ],
      rows,
      totals: [
        { label: 'Total ventas', value: `$${totalSales.toFixed(2)}` },
        { label: 'Total sueldos', value: `$${totalSalary.toFixed(2)}` },
        { label: 'Total comisiones', value: `$${totalCommissions.toFixed(2)}` },
        { label: 'Total bonos', value: `$${totalBonus.toFixed(2)}` },
        {
          label: 'Total nómina',
          value: `$${(totalSalary + totalCommissions + totalBonus).toFixed(2)}`,
        },
      ],
    };
  }

  private async attendanceReport(r: DateRange): Promise<ReportTable> {
    const fromStr = r.from.toISOString().slice(0, 10);
    const toStr = r.to.toISOString().slice(0, 10);
    const entries = await this.entryRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.user', 'user')
      .where('e.date >= :from', { from: fromStr })
      .andWhere('e.date <= :to', { to: toStr })
      .orderBy('e.date', 'ASC')
      .addOrderBy('e.inAt', 'ASC')
      .getMany();

    const rows = entries.map((e) => ({
      date: e.date,
      employee: (e as any).user?.name ?? '—',
      in: e.inAt,
      out: e.outAt ?? '—',
      mins: e.durationMins ?? 0,
      hours: ((e.durationMins ?? 0) / 60).toFixed(2),
    }));

    return {
      title: 'Asistencia',
      subtitle: `${fromStr} → ${toStr}`,
      columns: [
        { header: 'Fecha', key: 'date', width: 14 },
        { header: 'Empleada', key: 'employee', width: 26 },
        { header: 'Entrada', key: 'in', width: 12 },
        { header: 'Salida', key: 'out', width: 12 },
        { header: 'Minutos', key: 'mins', width: 12, format: 'number' },
        { header: 'Horas', key: 'hours', width: 12 },
      ],
      rows,
      totals: [
        { label: 'Marcas', value: rows.length },
        {
          label: 'Horas totales',
          value: rows.reduce((a, x) => a + Number(x.hours), 0).toFixed(2) + 'h',
        },
      ],
    };
  }

  private async topCategoriesReport(r: DateRange): Promise<ReportTable> {
    const sales = await this.saleRepo.find({
      where: { createdAt: Between(r.from, r.to), status: SaleStatus.COMPLETED },
    });
    if (sales.length === 0) {
      return {
        title: 'Top categorías',
        subtitle: 'Sin ventas en el rango',
        columns: [
          { header: 'Categoría', key: 'name' },
          { header: 'Total', key: 'total', format: 'money' },
        ],
        rows: [],
      };
    }
    const ids = sales.map((s) => s.id);
    const lines = await this.lineRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.item', 'item')
      .leftJoinAndSelect('item.category', 'category')
      .where('l.saleId IN (:...ids)', { ids })
      .getMany();

    const byCat = new Map<string, { revenue: number; units: number }>();
    for (const l of lines) {
      const name = (l.item as any)?.category?.label ?? 'Sin categoría';
      const entry = byCat.get(name) ?? { revenue: 0, units: 0 };
      entry.revenue += Number(l.price) * l.qty;
      entry.units += l.qty;
      byCat.set(name, entry);
    }

    const rows = Array.from(byCat.entries())
      .map(([name, v]) => ({ name, revenue: v.revenue, units: v.units }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      title: 'Top categorías',
      subtitle: `${r.from.toISOString().slice(0, 10)} → ${r.to.toISOString().slice(0, 10)}`,
      columns: [
        { header: 'Categoría', key: 'name', width: 22 },
        { header: 'Unidades', key: 'units', width: 12, format: 'number' },
        { header: 'Ingresos', key: 'revenue', width: 16, format: 'money' },
      ],
      rows,
      totals: [
        {
          label: 'Total ingresos',
          value: `$${rows.reduce((a, x) => a + x.revenue, 0).toFixed(2)}`,
        },
        {
          label: 'Total unidades',
          value: rows.reduce((a, x) => a + x.units, 0),
        },
      ],
    };
  }

  private async hoursWorkedReport(r: DateRange): Promise<ReportTable> {
    const fromStr = r.from.toISOString().slice(0, 10);
    const toStr = r.to.toISOString().slice(0, 10);
    const entries = await this.entryRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.user', 'user')
      .where('e.date >= :from', { from: fromStr })
      .andWhere('e.date <= :to', { to: toStr })
      .andWhere('e.durationMins IS NOT NULL')
      .getMany();

    const users = await this.userRepo.find({
      where: { status: UserStatus.ACTIVA },
    });
    const rows = users.map((u) => {
      const userEntries = entries.filter((e) => e.userId === u.id);
      const mins = userEntries.reduce((a, e) => a + (e.durationMins ?? 0), 0);
      const days = userEntries.length;
      const hourly = Number(u.salary) / (8 * 22);
      const totalHours = mins / 60;
      const cost = hourly * totalHours;
      return {
        name: u.name,
        position: u.position ?? '—',
        days,
        hours: +totalHours.toFixed(2),
        avgHours: days > 0 ? +(totalHours / days).toFixed(2) : 0,
        cost: +cost.toFixed(2),
      };
    });

    return {
      title: 'Horas trabajadas',
      subtitle: `${fromStr} → ${toStr}`,
      columns: [
        { header: 'Empleada', key: 'name', width: 26 },
        { header: 'Puesto', key: 'position', width: 18 },
        { header: 'Días', key: 'days', width: 10, format: 'number' },
        { header: 'Horas', key: 'hours', width: 12, format: 'number' },
        {
          header: 'Promedio diario',
          key: 'avgHours',
          width: 14,
          format: 'number',
        },
        { header: 'Costo estimado', key: 'cost', width: 14, format: 'money' },
      ],
      rows,
      totals: [
        {
          label: 'Horas totales',
          value: rows.reduce((a, x) => a + x.hours, 0).toFixed(2) + 'h',
        },
        {
          label: 'Costo estimado total',
          value: `$${rows.reduce((a, x) => a + x.cost, 0).toFixed(2)}`,
        },
      ],
    };
  }

  private async executiveReport(r: DateRange): Promise<ReportTable> {
    const sales = await this.saleRepo.find({
      where: { createdAt: Between(r.from, r.to), status: SaleStatus.COMPLETED },
    });
    const totalSales = sales.reduce((a, s) => a + Number(s.total), 0);
    const totalTips = sales.reduce((a, s) => a + Number(s.tip), 0);
    const totalDisc = sales.reduce((a, s) => a + Number(s.discountTotal), 0);
    const ticketCount = sales.length;
    const avgTicket = ticketCount > 0 ? totalSales / ticketCount : 0;

    let totalCost = 0;
    if (sales.length > 0) {
      const lines = await this.lineRepo
        .createQueryBuilder('l')
        .where('l.saleId IN (:...ids)', { ids: sales.map((s) => s.id) })
        .getMany();
      totalCost = lines.reduce((a, l) => a + Number(l.basePrice) * l.qty, 0);
    }
    const profit = totalSales - totalCost;
    const margin = totalSales > 0 ? (profit / totalSales) * 100 : 0;

    const employees = await this.userRepo.count({
      where: { status: UserStatus.ACTIVA },
    });

    return {
      title: 'Resumen ejecutivo',
      subtitle: `${r.from.toISOString().slice(0, 10)} → ${r.to.toISOString().slice(0, 10)}`,
      columns: [
        { header: 'Indicador', key: 'label', width: 36 },
        { header: 'Valor', key: 'value', width: 22 },
      ],
      rows: [
        { label: 'Ventas totales', value: `$${totalSales.toFixed(2)}` },
        { label: 'Descuentos aplicados', value: `$${totalDisc.toFixed(2)}` },
        { label: 'Propinas recolectadas', value: `$${totalTips.toFixed(2)}` },
        { label: 'Costo estimado', value: `$${totalCost.toFixed(2)}` },
        { label: 'Utilidad estimada', value: `$${profit.toFixed(2)}` },
        { label: 'Margen', value: `${margin.toFixed(1)}%` },
        { label: 'Tickets', value: ticketCount },
        { label: 'Ticket promedio', value: `$${avgTicket.toFixed(2)}` },
        { label: 'Empleadas activas', value: employees },
      ],
    };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private parseRange(from?: string, to?: string): DateRange {
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    const fromDate = from ? new Date(from) : defaultFrom;
    const toDate = to
      ? new Date(to)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      this.logger.errorWithContext({
        message: 'Invalid date range parameters',
        context: { from, to },
      });
      throw new BadRequestException(
        'Parámetros "from"/"to" inválidos (ISO 8601)',
      );
    }
    return { from: fromDate, to: toDate };
  }
}

interface DateRange {
  from: Date;
  to: Date;
}

function formatCell(
  value: unknown,
  format?: 'money' | 'number' | 'date' | 'text',
): string {
  if (value == null || value === '') return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (format === 'money' && typeof value === 'number')
    return `$${value.toFixed(2)}`;
  if (format === 'number' && typeof value === 'number')
    return value.toLocaleString();
  return String(value);
}
