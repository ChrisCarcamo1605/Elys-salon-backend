import { IsString, IsOptional } from 'class-validator';

export class VoidSaleDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
