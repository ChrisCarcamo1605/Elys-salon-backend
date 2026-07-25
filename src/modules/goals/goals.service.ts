import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Goal } from './entities/goal.entity';
import { Sale } from '../sales/entities/sale.entity';
import { SaleLine } from '../sales/entities/sale-line.entity';
import { TimeEntry } from '../timeclock/entities/time-entry.entity';
import {
  SaleStatus,
  ItemType,
  RewardType,
  ResetPeriod,
} from '../../common/enums';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { localDayRange, toLocalDateStr } from '../../common/utils/timezone';

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(Goal) private repo: Repository<Goal>,
    @InjectRepository(Sale) private saleRepo: Repository<Sale>,
    @InjectRepository(SaleLine) private lineRepo: Repository<SaleLine>,
    @InjectRepository(TimeEntry) private entryRepo: Repository<TimeEntry>,
  ) {}

  async findAll(): Promise<Goal[]> {
    return this.repo.find({ where: { active: true } });
  }

  async findOne(id: string): Promise<Goal> {
    const goal = await this.repo.findOne({ where: { id } });
    if (!goal) throw new NotFoundException('Meta no encontrada');
    return goal;
  }

  async create(dto: CreateGoalDto): Promise<Goal> {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: UpdateGoalDto): Promise<Goal> {
    const goal = await this.findOne(id);
    Object.assign(goal, dto);
    return this.repo.save(goal);
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.update(id, { active: false });
  }

  /**
   * Instante UTC en el que arranca el período vigente de una meta.
   *
   * Los cortes se calculan sobre el día calendario del salón
   * (America/El_Salvador, UTC-6), no sobre la hora del proceso: una venta de
   * las 7pm del día 31 cae en UTC del día siguiente, y con `new Date(y,m,d)`
   * el corte se desplazaba 6 horas. `localDayRange` ya resuelve eso y es el
   * mismo helper que usan ventas y analíticas.
   */
  private getPeriodStart(now: Date, resetPeriod: ResetPeriod): Date {
    if (resetPeriod === ResetPeriod.NONE) {
      return new Date(0);
    }

    const today = toLocalDateStr(now); // YYYY-MM-DD local
    if (resetPeriod === ResetPeriod.DAILY) {
      return localDayRange(today).from;
    }

    const [year, month, day] = today.split('-').map(Number);
    const startDay =
      resetPeriod === ResetPeriod.BIWEEKLY && day > 15 ? 16 : 1;
    const pad = (n: number) => String(n).padStart(2, '0');
    return localDayRange(`${year}-${pad(month)}-${pad(startDay)}`).from;
  }

  /**
   * Agrega en SQL en vez de traer las ventas a memoria: con
   * `resetPeriod = 'none'` el método anterior cargaba el historial completo de
   * la empleada (y un `IN (...)` sin límite con todos los ids) en cada refresco
   * de la pantalla de progreso, que se repite cada 30 s.
   */
  private async computeStats(userId: string, from: Date, to: Date) {
    const params = { userId, from, to, status: SaleStatus.COMPLETED };

    const saleAgg = await this.saleRepo
      .createQueryBuilder('s')
      .select('COALESCE(SUM(s.total), 0)', 'totalSales')
      .addSelect('COALESCE(SUM(s.tip), 0)', 'tipsCollected')
      .addSelect('COUNT(*) FILTER (WHERE s.customerIsNew)', 'newClients')
      .where('s.employeeId = :userId', params)
      .andWhere('s.status = :status', params)
      .andWhere('s.createdAt BETWEEN :from AND :to', params)
      .getRawOne<Record<string, string>>();

    const lineAgg = await this.lineRepo
      .createQueryBuilder('l')
      .innerJoin('l.sale', 's')
      .select(
        `COALESCE(SUM(l.qty) FILTER (WHERE l.itemType = '${ItemType.SERVICE}'), 0)`,
        'servicesDone',
      )
      .addSelect(
        `COALESCE(SUM(l.price * l.qty) FILTER (WHERE l.itemType = '${ItemType.PRODUCT}'), 0)`,
        'retailSales',
      )
      .where('s.employeeId = :userId', params)
      .andWhere('s.status = :status', params)
      .andWhere('s.createdAt BETWEEN :from AND :to', params)
      .getRawOne<Record<string, string>>();

    return {
      totalSales: Number(saleAgg?.totalSales ?? 0),
      retailSales: Number(lineAgg?.retailSales ?? 0),
      servicesDone: Number(lineAgg?.servicesDone ?? 0),
      newClients: Number(saleAgg?.newClients ?? 0),
      tipsCollected: Number(saleAgg?.tipsCollected ?? 0),
    };
  }

  async getProgress(userId: string) {
    const goals = await this.findAll();
    const now = new Date();

    // Compute stats once per unique reset period
    const uniquePeriods = [...new Set(goals.map((g) => g.resetPeriod ?? ResetPeriod.MONTHLY))];
    const statsCache = new Map<string, Awaited<ReturnType<typeof this.computeStats>>>();

    for (const period of uniquePeriods) {
      const start = this.getPeriodStart(now, period);
      statsCache.set(period, await this.computeStats(userId, start, now));
    }

    // Monthly stats for the summary header
    const monthStart = this.getPeriodStart(now, ResetPeriod.MONTHLY);
    const summaryStats = statsCache.get(ResetPeriod.MONTHLY)
      ?? await this.computeStats(userId, monthStart, now);

    const progress = goals.map((goal) => {
      const period = goal.resetPeriod ?? ResetPeriod.MONTHLY;
      const stats = statsCache.get(period)!;
      const value = Number((stats as any)[goal.metric] ?? 0);
      // `target` y `rewardValue` son numeric(10,2): el driver de pg los
      // devuelve como string y sin este Number() `value >= target` compara
      // texto y `earned` sale como "10.00", que el front luego concatena.
      const target = Number(goal.target);
      const rewardValue = Number(goal.rewardValue);

      const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
      const achieved = value >= target;
      const earned = achieved
        ? +(goal.rewardType === RewardType.FIXED
            ? rewardValue
            : value * (rewardValue / 100)
          ).toFixed(2)
        : 0;

      return {
        goal: { ...goal, target, rewardValue },
        value,
        pct,
        achieved,
        earned,
        periodStart: this.getPeriodStart(now, period),
      };
    });

    return { stats: summaryStats, goals: progress };
  }
}
