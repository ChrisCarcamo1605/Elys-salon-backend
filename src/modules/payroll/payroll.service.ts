import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { User } from '../staff/entities/user.entity';
import { Sale } from '../sales/entities/sale.entity';
import { UserStatus, SaleStatus } from '../../common/enums';
import { AppLogger } from '../../common/utils/logger';

@Injectable()
export class PayrollService {
  private readonly logger = new AppLogger(PayrollService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Sale) private saleRepo: Repository<Sale>,
  ) {}

  async calculate(month: string, period: 'biweek' | 'month' = 'month') {
    try {
      this.logger.infoWithContext('Calculating payroll', { month, period });

      const [year, mon] = month.split('-').map(Number);
      const from = new Date(year, mon - 1, 1);
      const to = new Date(year, mon, 0, 23, 59, 59);

      const divisor = period === 'biweek' ? 2 : 1;

      const employees = await this.userRepo.find({
        where: { status: UserStatus.ACTIVA },
      });
      this.logger.infoWithContext('Active employees retrieved for payroll', {
        count: employees.length,
      });

      const items = [];
      let totalsSales = 0;
      let totalsCommissions = 0;
      let totalsBonuses = 0;
      let totalsSalary = 0;
      let totalsTotal = 0;

      for (const emp of employees) {
        const sales = await this.saleRepo.find({
          where: {
            employeeId: emp.id,
            createdAt: Between(from, to),
            status: SaleStatus.COMPLETED,
          },
        });

        const monthlySales = sales.reduce((sum, s) => sum + Number(s.total), 0);
        const tipsTotal = sales.reduce((sum, s) => sum + Number(s.tip), 0);
        const salesPeriod = monthlySales / divisor;
        const salaryPeriod = Number(emp.salary) / divisor;
        const commissionRate = Number(emp.commissionRate) || 0;
        const commission = (salesPeriod * commissionRate) / 100;

        let bonusMonthly = 0;
        if (monthlySales > 2000) bonusMonthly = 200;
        else if (monthlySales > 1500) bonusMonthly = 100;
        else if (monthlySales > 1000) bonusMonthly = 50;
        const bonus = bonusMonthly / divisor;

        const total = salaryPeriod + commission + bonus;

        totalsSales += salesPeriod;
        totalsCommissions += commission;
        totalsBonuses += bonus;
        totalsSalary += salaryPeriod;
        totalsTotal += total;

        items.push({
          employeeId: emp.id,
          name: emp.name,
          role: emp.role,
          salary: Number(emp.salary),
          salaryPeriod,
          monthlySales,
          salesPeriod,
          commissionRate,
          commission,
          bonusMonthly,
          bonus,
          tips: tipsTotal,
          total,
        });
      }

      const result = {
        period,
        month,
        items,
        totals: {
          sales: totalsSales,
          commissions: totalsCommissions,
          bonuses: totalsBonuses,
          salaries: totalsSalary,
          total: totalsTotal,
        },
      };

      this.logger.infoWithContext('Payroll calculated successfully', {
        month,
        period,
        employeesCount: items.length,
        totalSales: totalsSales,
        totalPayroll: totalsTotal,
      });

      return result;
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to calculate payroll',
        error,
        context: { month, period },
      });
      throw error;
    }
  }
}
