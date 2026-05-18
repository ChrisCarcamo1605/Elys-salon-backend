import { IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class ListPromotionsDto {
  @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean()
  active?: boolean;
}