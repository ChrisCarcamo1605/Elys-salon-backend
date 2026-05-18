import { IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class ListEntriesDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  pageSize?: number;
}
