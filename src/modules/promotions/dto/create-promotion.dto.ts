import { IsString, IsOptional, IsBoolean, IsArray, Length } from 'class-validator';

export class CreatePromotionDto {
  @IsString()
  @Length(1, 120)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @Length(1, 40)
  off: string;

  @IsOptional()
  rule?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  itemIds?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
