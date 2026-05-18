import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Sale } from '../sales/entities/sale.entity';
import { SaleLine } from '../sales/entities/sale-line.entity';
import { CatalogItem } from '../catalog/entities/catalog-item.entity';
import { SaleStatus } from '../../common/enums';

interface CacheEntry<T> { data: T; expires: number }

@Injectable()
export class AnalyticsService {
  private cache = new Map<string, CacheEntry<any>>();
  private CACHE_TTL = 5 * 60 * 1000; // 5 min

  constructor(
    @InjectRepository(Sale) private saleRepo: Repository<Sale>,
    @InjectRepository(SaleLine) private lineRepo: Repository<SaleLine>,
    @InjectRepository(CatalogItem) private catalogRepo: Repository<CatalogItem>,
  ) {}

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) { this.cache.delete(key); return null; }
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T): T {
    this.cache.set(key, { data, expires: Date.now() + this.CACHE_TTL });
    return data;
  }

  async getSalesByDay(range: string = '30d') {
    const cacheKey = `salesByDay:${range}`;
    const cached = this.getCached<any>(cacheKey);
    if (cached) return cached;

    const days = parseInt(range) || 30;
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const sales = await this.saleRepo.find({
      where: { createdAt: Between(from, new Date()), status: SaleStatus.COMPLETED },
      order: { createdAt: 'ASC' },
    });

    const byDay = new Map<string, { sales: number; cost: number; tickets: number }>();
    for (const s of sales) {
      const day = s.createdAt.toISOString().split('T')[0];
      const entry = byDay.get(day) ?? { sales: 0, cost: 0, tickets: 0 };
      entry.sales += Number(s.total);
      entry.tickets += 1;
      byDay.set(day, entry);
    }

    return this.setCache(cacheKey, Array.from(byDay.entries()).map(([date, v]) => ({ date, ...v })));
  }

  async getCategoryRevenue(range: string = '30d') {
    const cacheKey = `categoryRevenue:${range}`;
    const cached = this.getCached<any>(cacheKey);
    if (cached) return cached;

    const days = parseInt(range) || 30;
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const sales = await this.saleRepo.find({
      where: { createdAt: Between(from, new Date()), status: SaleStatus.COMPLETED },
      relations: ['lines'],
    });

    const saleIds = sales.map(s => s.id);
    if (saleIds.length === 0) return [];

    const lines = await this.lineRepo.createQueryBuilder('l')
      .leftJoinAndSelect('l.item', 'item')
      .leftJoinAndSelect('item.category', 'category')
      .where('l.saleId IN (:...ids)', { ids: saleIds })
      .getMany();

    const byCategory = new Map<string, number>();
    for (const l of lines) {
      const cat = (l.item as any)?.category?.label ?? 'Sin categoría';
      const lineTotal = Number(l.price) * l.qty;
      const discount = l.discountKind === 'percent' as any ? lineTotal * (Number(l.discountValue) / 100) : Number(l.discountValue);
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + (lineTotal - discount));
    }

    return this.setCache(cacheKey, Array.from(byCategory.entries()).map(([category, revenue]) => ({ category, revenue })));
  }

  async getTopEmployees(range: string = '30d') {
    const cacheKey = `topEmployees:${range}`;
    const cached = this.getCached<any>(cacheKey);
    if (cached) return cached;

    const days = parseInt(range) || 30;
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const sales = await this.saleRepo.find({
      where: { createdAt: Between(from, new Date()), status: SaleStatus.COMPLETED },
      relations: ['employee'],
    });

    const byEmployee = new Map<string, { name: string; total: number; tickets: number }>();
    for (const s of sales) {
      const eid = s.employeeId;
      const entry = byEmployee.get(eid) ?? { name: (s.employee as any)?.name ?? eid, total: 0, tickets: 0 };
      entry.total += Number(s.total);
      entry.tickets += 1;
      byEmployee.set(eid, entry);
    }

    return this.setCache(cacheKey, Array.from(byEmployee.entries())
      .map(([id, v]) => ({ employeeId: id, ...v }))
      .sort((a, b) => b.total - a.total));
  }

  async getHourlyTraffic(date?: string) {
    const cacheKey = `hourlyTraffic:${date ?? 'today'}`;
    const cached = this.getCached<any>(cacheKey);
    if (cached) return cached;

    const targetDate = date ?? new Date().toISOString().split('T')[0];
    const sales = await this.saleRepo
      .createQueryBuilder('s')
      .where('DATE(s.createdAt) = :date AND s.status = :status', { date: targetDate, status: SaleStatus.COMPLETED })
      .getMany();

    const byHour = new Map<number, number>();
    for (let i = 0; i < 24; i++) byHour.set(i, 0);
    for (const s of sales) {
      const hour = new Date(s.createdAt).getHours();
      byHour.set(hour, (byHour.get(hour) ?? 0) + 1);
    }
    return this.setCache(cacheKey, Array.from(byHour.entries()).map(([hour, count]) => ({ hour, count })));
  }

  async getKpis(range: string = '30d') {
    const cacheKey = `kpis:${range}`;
    const cached = this.getCached<any>(cacheKey);
    if (cached) return cached;

    const days = parseInt(range) || 30;
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const prevFrom = new Date(from.getTime() - days * 24 * 60 * 60 * 1000);

    const [currentSales, previousSales] = await Promise.all([
      this.saleRepo.find({ where: { createdAt: Between(from, new Date()), status: SaleStatus.COMPLETED } }),
      this.saleRepo.find({ where: { createdAt: Between(prevFrom, from), status: SaleStatus.COMPLETED } }),
    ]);

    const totalSales = currentSales.reduce((s, sale) => s + Number(sale.total), 0);
    const prevTotalSales = previousSales.reduce((s, sale) => s + Number(sale.total), 0);
    const avgTicket = currentSales.length > 0 ? totalSales / currentSales.length : 0;

    const currentSaleIds = currentSales.map(s => s.id);
    let totalCost = 0;
    if (currentSaleIds.length > 0) {
      const lines = await this.lineRepo.createQueryBuilder('l')
        .where('l.saleId IN (:...ids)', { ids: currentSaleIds })
        .getMany();
      for (const l of lines) {
        totalCost += Number(l.basePrice) * l.qty;
      }
    }

    const totalProfit = totalSales - totalCost;
    const margin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
    const salesDelta = prevTotalSales > 0 ? ((totalSales - prevTotalSales) / prevTotalSales) * 100 : 0;

    return this.setCache(cacheKey, {
      totalSales,
      totalProfit: Math.round(totalProfit * 100) / 100,
      margin: Math.round(margin * 100) / 100,
      avgTicket: Math.round(avgTicket * 100) / 100,
      ticketCount: currentSales.length,
      salesDelta: Math.round(salesDelta * 100) / 100,
    });
  }
}