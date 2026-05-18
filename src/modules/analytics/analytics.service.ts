import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Sale } from '../sales/entities/sale.entity';
import { SaleLine } from '../sales/entities/sale-line.entity';
import { CatalogItem } from '../catalog/entities/catalog-item.entity';
import { SaleStatus } from '../../common/enums';
import { AppLogger } from '../../common/utils/logger';

interface CacheEntry<T> {
  data: T;
  expires: number;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new AppLogger(AnalyticsService.name);
  private cache = new Map<string, CacheEntry<any>>();
  private CACHE_TTL = 5 * 60 * 1000;

  constructor(
    @InjectRepository(Sale) private saleRepo: Repository<Sale>,
    @InjectRepository(SaleLine) private lineRepo: Repository<SaleLine>,
    @InjectRepository(CatalogItem) private catalogRepo: Repository<CatalogItem>,
  ) {}

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T): T {
    this.cache.set(key, { data, expires: Date.now() + this.CACHE_TTL });
    return data;
  }

  async getSalesByDay(range: string = '30d') {
    try {
      const cacheKey = `salesByDay:${range}`;
      const cached = this.getCached<any>(cacheKey);
      if (cached) {
        this.logger.infoWithContext('Sales by day retrieved from cache', {
          range,
        });
        return cached;
      }

      const days = parseInt(range) || 30;
      const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const sales = await this.saleRepo.find({
        where: {
          createdAt: Between(from, new Date()),
          status: SaleStatus.COMPLETED,
        },
        relations: ['lines'],
        order: { createdAt: 'ASC' },
      });

      const byDay = new Map<
        string,
        { sales: number; cost: number; tickets: number }
      >();
      for (const s of sales) {
        const day = (s.createdAt instanceof Date ? s.createdAt : new Date(s.createdAt)).toISOString().split('T')[0];
        const entry = byDay.get(day) ?? { sales: 0, cost: 0, tickets: 0 };
        entry.sales += Number(s.total);
        entry.tickets += 1;
        if (s.lines) {
          for (const l of s.lines) {
            entry.cost += Number(l.basePrice) * l.qty;
          }
        }
        byDay.set(day, entry);
      }

      const result = this.setCache(
        cacheKey,
        Array.from(byDay.entries()).map(([date, v]) => ({
          date,
          label: `${+date.split('-')[2]}/${+date.split('-')[1]}`,
          ventas: Math.round(v.sales * 100) / 100,
          costos: Math.round(v.cost * 100) / 100,
          utilidad: Math.round((v.sales - v.cost) * 100) / 100,
          tickets: v.tickets,
        })),
      );
      this.logger.infoWithContext('Sales by day computed', {
        range,
        daysCount: byDay.size,
        totalSales: sales.length,
      });
      return result;
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to get sales by day',
        error,
        context: { range },
      });
      throw error;
    }
  }

  async getCategoryRevenue(range: string = '30d') {
    try {
      const cacheKey = `categoryRevenue:${range}`;
      const cached = this.getCached<any>(cacheKey);
      if (cached) {
        this.logger.infoWithContext('Category revenue retrieved from cache', {
          range,
        });
        return cached;
      }

      const days = parseInt(range) || 30;
      const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const sales = await this.saleRepo.find({
        where: {
          createdAt: Between(from, new Date()),
          status: SaleStatus.COMPLETED,
        },
        relations: ['lines'],
      });

      const saleIds = sales.map((s) => s.id);
      if (saleIds.length === 0) {
        this.logger.infoWithContext('No sales found for category revenue', {
          range,
        });
        return [];
      }

      const lines = await this.lineRepo
        .createQueryBuilder('l')
        .leftJoinAndSelect('l.item', 'item')
        .leftJoinAndSelect('item.category', 'category')
        .where('l.saleId IN (:...ids)', { ids: saleIds })
        .getMany();

      const byCategory = new Map<string, number>();
      for (const l of lines) {
        const cat = (l.item as any)?.category?.label ?? 'Sin categoría';
        const lineTotal = Number(l.price) * l.qty;
        const discount =
          l.discountKind === ('percent' as any)
            ? lineTotal * (Number(l.discountValue) / 100)
            : Number(l.discountValue);
        byCategory.set(
          cat,
          (byCategory.get(cat) ?? 0) + (lineTotal - discount),
        );
      }

      const colors = ['#de0fab', '#0fb0de', '#7b2cbf', '#f59e0b', '#10b981', '#64748b'];
      const result = this.setCache(
        cacheKey,
        Array.from(byCategory.entries()).map(([category, revenue], i) => ({
          name: category,
          value: Math.round(revenue * 100) / 100,
          color: colors[i % colors.length],
        })),
      );
      this.logger.infoWithContext('Category revenue computed', {
        range,
        categoriesCount: byCategory.size,
      });
      return result;
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to get category revenue',
        error,
        context: { range },
      });
      throw error;
    }
  }

  async getTopEmployees(range: string = '30d') {
    try {
      const cacheKey = `topEmployees:${range}`;
      const cached = this.getCached<any>(cacheKey);
      if (cached) {
        this.logger.infoWithContext('Top employees retrieved from cache', {
          range,
        });
        return cached;
      }

      const days = parseInt(range) || 30;
      const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const sales = await this.saleRepo.find({
        where: {
          createdAt: Between(from, new Date()),
          status: SaleStatus.COMPLETED,
        },
        relations: ['employee'],
      });

      const byEmployee = new Map<
        string,
        { name: string; total: number; tickets: number }
      >();
      for (const s of sales) {
        const eid = s.employeeId;
        const entry = byEmployee.get(eid) ?? {
          name: (s.employee as any)?.name ?? eid,
          total: 0,
          tickets: 0,
        };
        entry.total += Number(s.total);
        entry.tickets += 1;
        byEmployee.set(eid, entry);
      }

      const result = this.setCache(
        cacheKey,
        Array.from(byEmployee.entries())
          .map(([id, v]) => ({
            employeeId: id,
            name: v.name,
            ventas: Math.round(v.total * 100) / 100,
            servicios: v.tickets,
          }))
          .sort((a, b) => b.ventas - a.ventas),
      );

      this.logger.infoWithContext('Top employees computed', {
        range,
        employeesCount: byEmployee.size,
      });
      return result;
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to get top employees',
        error,
        context: { range },
      });
      throw error;
    }
  }

  async getHourlyTraffic(date?: string) {
    try {
      const cacheKey = `hourlyTraffic:${date ?? 'today'}`;
      const cached = this.getCached<any>(cacheKey);
      if (cached) {
        this.logger.infoWithContext('Hourly traffic retrieved from cache', {
          date,
        });
        return cached;
      }

      const targetDate = date ?? new Date().toISOString().split('T')[0];
      const sales = await this.saleRepo
        .createQueryBuilder('s')
        .where('DATE(s.createdAt) = :date AND s.status = :status', {
          date: targetDate,
          status: SaleStatus.COMPLETED,
        })
        .getMany();

      const byHour = new Map<number, number>();
      for (let i = 0; i < 24; i++) byHour.set(i, 0);
      for (const s of sales) {
        const hour = new Date(s.createdAt).getHours();
        byHour.set(hour, (byHour.get(hour) ?? 0) + 1);
      }

      const result = this.setCache(
        cacheKey,
        Array.from(byHour.entries()).map(([hour, count]) => ({
          hour: String(hour),
          clientes: count,
        })),
      );
      this.logger.infoWithContext('Hourly traffic computed', {
        date: targetDate,
        totalSales: sales.length,
      });
      return result;
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to get hourly traffic',
        error,
        context: { date },
      });
      throw error;
    }
  }

  async getKpis(range: string = '30d') {
    try {
      const cacheKey = `kpis:${range}`;
      const cached = this.getCached<any>(cacheKey);
      if (cached) {
        this.logger.infoWithContext('KPIs retrieved from cache', { range });
        return cached;
      }

      const days = parseInt(range) || 30;
      const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const prevFrom = new Date(from.getTime() - days * 24 * 60 * 60 * 1000);

      const [currentSales, previousSales] = await Promise.all([
        this.saleRepo.find({
          where: {
            createdAt: Between(from, new Date()),
            status: SaleStatus.COMPLETED,
          },
        }),
        this.saleRepo.find({
          where: {
            createdAt: Between(prevFrom, from),
            status: SaleStatus.COMPLETED,
          },
        }),
      ]);

      const totalSales = currentSales.reduce(
        (s, sale) => s + Number(sale.total),
        0,
      );
      const prevTotalSales = previousSales.reduce(
        (s, sale) => s + Number(sale.total),
        0,
      );
      const avgTicket =
        currentSales.length > 0 ? totalSales / currentSales.length : 0;

      const currentSaleIds = currentSales.map((s) => s.id);
      let totalCost = 0;
      if (currentSaleIds.length > 0) {
        const lines = await this.lineRepo
          .createQueryBuilder('l')
          .where('l.saleId IN (:...ids)', { ids: currentSaleIds })
          .getMany();
        for (const l of lines) {
          totalCost += Number(l.basePrice) * l.qty;
        }
      }

      const totalProfit = totalSales - totalCost;
      const margin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
      const salesDelta =
        prevTotalSales > 0
          ? ((totalSales - prevTotalSales) / prevTotalSales) * 100
          : 0;

      const result = this.setCache(cacheKey, {
        totalSales,
        totalProfit: Math.round(totalProfit * 100) / 100,
        margin: Math.round(margin * 100) / 100,
        avgTicket: Math.round(avgTicket * 100) / 100,
        ticketCount: currentSales.length,
        salesDelta: Math.round(salesDelta * 100) / 100,
      });

      this.logger.infoWithContext('KPIs computed', {
        range,
        totalSales,
        totalProfit,
        margin,
        currentSalesCount: currentSales.length,
        previousSalesCount: previousSales.length,
      });

      return result;
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to get KPIs',
        error,
        context: { range },
      });
      throw error;
    }
  }
}
