import { IsNumber, IsBoolean } from 'class-validator';

export class StockConfigDto {
  @IsNumber()
  defaultMinStock: number;

  @IsBoolean()
  enabledByDefault: boolean;
}