import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { InventoryKind, AdjustmentReason } from '../../../common/enums';

export class CreateEntryDto {
  @IsString()
  productId: string;

  @IsEnum(InventoryKind)
  kind: InventoryKind;

  @IsNumber()
  qtyDelta: number;

  @IsOptional() @IsNumber()
  unitCost?: number;

  @IsOptional() @IsNumber()
  totalCost?: number;

  @IsOptional() @IsString()
  supplier?: string;

  @IsOptional() @IsString()
  invoice?: string;

  @IsOptional() @IsEnum(AdjustmentReason)
  reason?: AdjustmentReason;

  @IsOptional() @IsString()
  notes?: string;
}