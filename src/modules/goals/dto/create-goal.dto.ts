import {
  IsString,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsOptional,
  Length,
} from 'class-validator';
import { BonusMetric, RewardType, GoalTone } from '../../../common/enums';

export class CreateGoalDto {
  @IsString()
  @Length(1, 60)
  icon: string;

  @IsString()
  @Length(1, 100)
  label: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(BonusMetric)
  metric: BonusMetric;

  @IsString()
  unit: string;

  @IsNumber()
  target: number;

  @IsOptional()
  @IsString()
  reward?: string;

  @IsEnum(RewardType)
  rewardType: RewardType;

  @IsOptional()
  @IsNumber()
  rewardValue?: number;

  @IsEnum(GoalTone)
  tone: GoalTone;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
