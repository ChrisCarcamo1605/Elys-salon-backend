import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Goal } from './entities/goal.entity';
import { Sale } from '../sales/entities/sale.entity';
import { SaleLine } from '../sales/entities/sale-line.entity';
import { TimeEntry } from '../timeclock/entities/time-entry.entity';
import { SaleStatus, BonusMetric, ResetPeriod } from '../../common/enums';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

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

  private getPeriodStart(now: Date, resetPeriod: ResetPeriod): Date {
    if (resetPeriod === ResetPeriod.BIWEEKLY) {
      return now.getDate() <= 15
        ? new Date(now.getFullYear(), now.getMonth(), 1)
        : new Date(now.getFullYear(), now.getMonth(), 16);
    }
    if (resetPeriod === ResetPeriod.NONE) {
      return new Date(0);
    }
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  private async computeStats(userId: string, from: Date, to: Date) {
    const sales = await this.saleRepo.find({
      where: {
        employeeId: userId,
        createdAt: Between(from, to),
        status: SaleStatus.COMPLETED,
      },
    });

    let totalSales = 0;
    let tipsCollected = 0;
    let newClients = 0;
    let servicesDone = 0;
    let retailSales = 0;

    for (const s of sales) {
      totalSales += Number(s.total);
      tipsCollected += Number(s.tip);
      if (s.customerIsNew) newClients++;
    }

    const saleIds = sales.map((s) => s.id);
    if (saleIds.length > 0) {
      const lines = await this.lineRepo
        .createQueryBuilder('l')
        .where('l.saleId IN (:...ids)', { ids: saleIds })
        .getMany();

      for (const l of lines) {
        if (l.itemType === 'S') servicesDone += l.qty;
        if (l.itemType === 'P') retailSales += Number(l.price) * l.qty;
      }
    }

    return { totalSales, retailSales, servicesDone, newClients, tipsCollected };
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
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const summaryStats = statsCache.get(ResetPeriod.MONTHLY)
      ?? await this.computeStats(userId, monthStart, now);

    const progress = goals.map((goal) => {
      const period = goal.resetPeriod ?? ResetPeriod.MONTHLY;
      const stats = statsCache.get(period)!;
      const value = (stats as any)[goal.metric] ?? 0;
      const pct =
        goal.target > 0 ? Math.min((value / goal.target) * 100, 100) : 0;
      const achieved = value >= goal.target;
      let earned = 0;
      if (achieved) {
        earned =
          goal.rewardType === ('fixed' as any)
            ? goal.rewardValue
            : value * (goal.rewardValue / 100);
      }
      return { goal, value, pct, achieved, earned };
    });

    return { stats: summaryStats, goals: progress };
  }
}
