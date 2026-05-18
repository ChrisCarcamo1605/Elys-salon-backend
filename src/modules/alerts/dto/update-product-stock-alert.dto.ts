import { IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class UpdateProductStockAlertDto {
  @IsOptional()
  @IsBoolean()
  alertEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  stockMin?: number;
}
