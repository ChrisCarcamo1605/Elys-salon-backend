import { DataSource } from 'typeorm';
import { Goal } from '../../modules/goals/entities/goal.entity';
import { BonusMetric, RewardType, GoalTone } from '../../common/enums';

const GOALS: Partial<Goal>[] = [
  {
    icon: '💰',
    label: 'Meta de ventas',
    description: 'Alcanzar $3,000 en ventas mensuales',
    metric: BonusMetric.TOTAL_SALES,
    unit: 'MXN',
    target: 3000,
    reward: 'Bono de ventas',
    rewardType: RewardType.FIXED,
    rewardValue: 200,
    tone: GoalTone.MAGENTA,
    active: true,
  },
  {
    icon: '💇',
    label: 'Servicios completados',
    description: 'Completar 50 servicios en el mes',
    metric: BonusMetric.SERVICES_DONE,
    unit: 'servicios',
    target: 50,
    reward: 'Bono por productividad',
    rewardType: RewardType.FIXED,
    rewardValue: 150,
    tone: GoalTone.TEAL,
    active: true,
  },
  {
    icon: '🛍️',
    label: 'Ventas retail',
    description: 'Vender $1,000 en productos',
    metric: BonusMetric.RETAIL_SALES,
    unit: 'MXN',
    target: 1000,
    reward: '% de ventas retail',
    rewardType: RewardType.PERCENT,
    rewardValue: 5,
    tone: GoalTone.PURPLE,
    active: true,
  },
  {
    icon: '🆕',
    label: 'Clientes nuevos',
    description: 'Conseguir 10 clientes nuevos',
    metric: BonusMetric.NEW_CLIENTS,
    unit: 'clientes',
    target: 10,
    reward: 'Bono por nuevos clientes',
    rewardType: RewardType.FIXED,
    rewardValue: 100,
    tone: GoalTone.GREEN,
    active: true,
  },
];

export async function seedGoals(ds: DataSource): Promise<Goal[]> {
  const repo = ds.getRepository(Goal);
  const existing = await repo.count();
  if (existing > 0) return repo.find();

  for (const g of GOALS) {
    await repo.save(repo.create(g));
  }
  return repo.find();
}
