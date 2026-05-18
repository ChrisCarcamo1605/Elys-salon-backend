import {
  IsString,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsOptional,
  Length,
} from 'class-validator';
import { ItemType } from '../../../common/enums';

export class CreateCatalogItemDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsEnum(ItemType)
  type: ItemType;

  @IsString()
  @Length(1, 200)
  name: string;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsNumber()
  cost?: number;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  duration?: string;

  @IsOptional()
  @IsNumber()
  stock?: number;

  @IsOptional()
  @IsNumber()
  stockMin?: number;

  @IsOptional()
  @IsBoolean()
  alertEnabled?: boolean;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
