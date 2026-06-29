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
  private readonly CACHE_TTL = 5 * 60 * 1000;
  private readonly CACHE_TTL_TODAY = 60 * 1000; // 1 min when range includes today

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

  private setCache<T>(key: string, data: T, ttl?: number): T {
    this.cache.set(key, { data, expires: Date.now() + (ttl ?? this.CACHE_TTL) });
    return data;
  }

  private parseDateRange(range?: string, from?: string, to?: string) {
    const todayStr = new Date().toISOString().split('T')[0];

    if (from && to) {
      return {
        from: new Date(from + 'T00:00:00'),
        to: new Date(to + 'T23:59:59.999'),
        cacheKey: `${from}:${to}`,
        includesToday: to >= todayStr,
      };
    }

    const r = range ?? '30d';
    if (r === 'today') {
      return {
        from: new Date(todayStr + 'T00:00:00'),
        to: new Date(todayStr + 'T23:59:59.999'),
        cacheKey: 'today',
        includesToday: true,
      };
    }

    const days = parseInt(r) || 30;
    return {
      from: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      to: new Date(),
      cacheKey: r,
      includesToday: true,
    };
  }

  async getSalesByDay(range = '30d', from?: string, to?: string) {
    try {
      const dr = this.parseDateRange(range, from, to);
      const cacheKey = `salesByDay:${dr.cacheKey}`;
      const cached = this.getCached<any>(cacheKey);
      if (cached) return cached;

      const sales = await this.saleRepo.find({
        where: { createdAt: Between(dr.from, dr.to), status: SaleStatus.COMPLETED },
        relations: ['lines', 'lines.item'],
        order: { createdAt: 'ASC' },
      });

      const byDay = new Map<string, { sales: number; cost: number; tickets: number }>();
      for (const s of sales) {
        const day = (s.createdAt instanceof Date ? s.createdAt : new Date(s.createdAt))
          .toISOString().split('T')[0];
        const entry = byDay.get(day) ?? { sales: 0, cost: 0, tickets: 0 };
        entry.sales += Number(s.total);
        entry.tickets += 1;
        if (s.lines) {
          for (const l of s.lines) {
            entry.cost += Number((l.item as any)?.cost ?? 0) * l.qty;
          }
        }
        byDay.set(day, entry);
      }

      const ttl = dr.includesToday ? this.CACHE_TTL_TODAY : this.CACHE_TTL;
      return this.setCache(
        cacheKey,
        Array.from(byDay.entries()).map(([date, v]) => ({
          date,
          label: `${+date.split('-')[2]}/${+date.split('-')[1]}`,
          ventas: Math.round(v.sales * 100) / 100,
          costos: Math.round(v.cost * 100) / 100,
          utilidad: Math.round((v.sales - v.cost) * 100) / 100,
          tickets: v.tickets,
        })),
        ttl,
      );
    } catch (error) {
      this.logger.errorWithContext({ message: 'Failed to get sales by day', error, context: { range, from, to } });
      throw error;
    }
  }

  async getCategoryRevenue(range = '30d', from?: string, to?: string) {
    try {
      const dr = this.parseDateRange(range, from, to);
      const cacheKey = `categoryRevenue:${dr.cacheKey}`;
      const cached = this.getCached<any>(cacheKey);
      if (cached) return cached;

      const sales = await this.saleRepo.find({
        where: { createdAt: Between(dr.from, dr.to), status: SaleStatus.COMPLETED },
        relations: ['lines'],
      });

      const saleIds = sales.map((s) => s.id);
      if (saleIds.length === 0) return [];

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
            : Number(l.discountValue ?? 0);
        byCategory.set(cat, (byCategory.get(cat) ?? 0) + (lineTotal - discount));
      }

      const colors = ['#de0fab', '#0fb0de', '#7b2cbf', '#f59e0b', '#10b981', '#64748b'];
      const ttl = dr.includesToday ? this.CACHE_TTL_TODAY : this.CACHE_TTL;
      return this.setCache(
        cacheKey,
        Array.from(byCategory.entries()).map(([category, revenue], i) => ({
          name: category,
          value: Math.round(revenue * 100) / 100,
          color: colors[i % colors.length],
        })),
        ttl,
      );
    } catch (error) {
      this.logger.errorWithContext({ message: 'Failed to get category revenue', error, context: { range, from, to } });
      throw error;
    }
  }

  async getTopEmployees(range = '30d', from?: string, to?: string) {
    try {
      const dr = this.parseDateRange(range, from, to);
      const cacheKey = `topEmployees:${dr.cacheKey}`;
      const cached = this.getCached<any>(cacheKey);
      if (cached) return cached;

      const sales = await this.saleRepo.find({
        where: { createdAt: Between(dr.from, dr.to), status: SaleStatus.COMPLETED },
        relations: ['employee'],
      });

      const byEmployee = new Map<string, { name: string; total: number; tickets: number }>();
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

      const ttl = dr.includesToday ? this.CACHE_TTL_TODAY : this.CACHE_TTL;
      return this.setCache(
        cacheKey,
        Array.from(byEmployee.entries())
          .map(([id, v]) => ({
            employeeId: id,
            name: v.name,
            ventas: Math.round(v.total * 100) / 100,
            servicios: v.tickets,
          }))
          .sort((a, b) => b.ventas - a.ventas),
        ttl,
      );
    } catch (error) {
      this.logger.errorWithContext({ message: 'Failed to get top employees', error, context: { range, from, to } });
      throw error;
    }
  }

  async getHourlyTraffic(date?: string) {
    try {
      const targetDate = date ?? new Date().toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      const isToday = targetDate === todayStr;
      const cacheKey = `hourlyTraffic:${targetDate}`;
      const cached = this.getCached<any>(cacheKey);
      if (cached) return cached;

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

      const ttl = isToday ? this.CACHE_TTL_TODAY : this.CACHE_TTL;
      return this.setCache(
        cacheKey,
        Array.from(byHour.entries()).map(([hour, count]) => ({
          hour: String(hour),
          clientes: count,
        })),
        ttl,
      );
    } catch (error) {
      this.logger.errorWithContext({ message: 'Failed to get hourly traffic', error, context: { date } });
      throw error;
    }
  }

  async getKpis(range = '30d', from?: string, to?: string) {
    try {
      const dr = this.parseDateRange(range, from, to);
      const cacheKey = `kpis:${dr.cacheKey}`;
      const cached = this.getCached<any>(cacheKey);
      if (cached) return cached;

      // Previous period of same duration for delta
      const duration = dr.to.getTime() - dr.from.getTime();
      const prevFrom = new Date(dr.from.getTime() - duration);

      const [currentSales, previousSales] = await Promise.all([
        this.saleRepo.find({
          where: { createdAt: Between(dr.from, dr.to), status: SaleStatus.COMPLETED },
        }),
        this.saleRepo.find({
          where: { createdAt: Between(prevFrom, dr.from), status: SaleStatus.COMPLETED },
        }),
      ]);

      const totalSales = currentSales.reduce((s, sale) => s + Number(sale.total), 0);
      const prevTotalSales = previousSales.reduce((s, sale) => s + Number(sale.total), 0);
      const avgTicket = currentSales.length > 0 ? totalSales / currentSales.length : 0;

      const currentSaleIds = currentSales.map((s) => s.id);
      let totalCost = 0;
      if (currentSaleIds.length > 0) {
        const lines = await this.lineRepo
          .createQueryBuilder('l')
          .leftJoinAndSelect('l.item', 'item')
          .where('l.saleId IN (:...ids)', { ids: currentSaleIds })
          .getMany();
        for (const l of lines) {
          totalCost += Number((l as any).item?.cost ?? 0) * l.qty;
        }
      }

      const totalProfit = totalSales - totalCost;
      const margin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
      const salesDelta =
        prevTotalSales > 0 ? ((totalSales - prevTotalSales) / prevTotalSales) * 100 : 0;

      const ttl = dr.includesToday ? this.CACHE_TTL_TODAY : this.CACHE_TTL;
      return this.setCache(
        cacheKey,
        {
          totalSales,
          totalProfit: Math.round(totalProfit * 100) / 100,
          margin: Math.round(margin * 100) / 100,
          avgTicket: Math.round(avgTicket * 100) / 100,
          ticketCount: currentSales.length,
          salesDelta: Math.round(salesDelta * 100) / 100,
        },
        ttl,
      );
    } catch (error) {
      this.logger.errorWithContext({ message: 'Failed to get KPIs', error, context: { range, from, to } });
      throw error;
    }
  }
}
