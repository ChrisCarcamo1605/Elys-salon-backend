import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { AdjustmentReason } from '../../../common/enums';

export class CreateAdjustmentDto {
  @IsString()
  productId: string;

  @IsString()
  mode: 'set' | 'delta';

  @IsNumber()
  value: number;

  @IsEnum(AdjustmentReason)
  reason: AdjustmentReason;

  @IsOptional()
  @IsString()
  notes?: string;
}
