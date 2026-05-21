import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BonusMetric, RewardType, GoalTone, ResetPeriod } from '../../../common/enums';

@Entity('goals')
export class Goal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 60 })
  icon: string;

  @Column({ length: 100 })
  label: string;

  @Column({ length: 500, nullable: true })
  description: string;

  @Column({ type: 'enum', enum: BonusMetric })
  metric: BonusMetric;

  @Column({ length: 20 })
  unit: string;

  @Column({ name: 'target', type: 'numeric', precision: 10, scale: 2 })
  target: number;

  @Column({ length: 120, nullable: true })
  reward: string;

  @Column({ name: 'reward_type', type: 'enum', enum: RewardType })
  rewardType: RewardType;

  @Column({
    name: 'reward_value',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
  })
  rewardValue: number;

  @Column({ type: 'enum', enum: GoalTone })
  tone: GoalTone;

  @Column({ type: 'enum', enum: ResetPeriod, default: ResetPeriod.MONTHLY })
  resetPeriod: ResetPeriod;

  @Column({ default: true })
  active: boolean;
}
