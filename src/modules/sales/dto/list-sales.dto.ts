import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { IsNumber, Min } from 'class-validator';
import { SaleStatus } from '../../../common/enums';

export class ListSalesDto {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  /** Atajo de rango ('today' | '7d' | '30d' | '90d' | '365d'); si viene, tiene
   * prioridad sobre `from`/`to` y se resuelve con el mismo cálculo de día
   * calendario local que usa analytics (evita que "Hoy" difiera entre pantallas). */
  @IsOptional()
  @IsString()
  range?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  pageSize?: number;
}
