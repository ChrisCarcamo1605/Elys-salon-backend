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
