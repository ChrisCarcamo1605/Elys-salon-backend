import {
  IsString,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsOptional,
  ValidateNested,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DiscountKind, PaymentMethod, ItemType } from '../../../common/enums';

export class SaleLineDto {
  @IsString()
  itemId: string;

  @IsEnum(ItemType)
  itemType: ItemType;

  @IsString()
  itemName: string;

  @IsNumber()
  basePrice: number;

  @IsNumber()
  price: number;

  @IsNumber()
  @Min(1)
  qty: number;

  @IsOptional()
  @IsEnum(DiscountKind)
  discountKind?: DiscountKind;

  @IsOptional()
  @IsNumber()
  discountValue?: number;

  @IsOptional()
  @IsString()
  discountById?: string;
}

export class SalePaymentDto {
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  cardLast4?: string;

  @IsOptional()
  @IsString()
  cardBrand?: string;

  @IsOptional()
  @IsString()
  authCode?: string;
}

export class CreateSaleDto {
  @IsString()
  employeeId: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsBoolean()
  customerIsNew?: boolean;

  @IsNumber()
  subtotal: number;

  @IsOptional()
  @IsNumber()
  discountTotal?: number;

  @IsNumber()
  total: number;

  @IsOptional()
  @IsNumber()
  tip?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleLineDto)
  lines: SaleLineDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalePaymentDto)
  payments: SalePaymentDto[];
}
