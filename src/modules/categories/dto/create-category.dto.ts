import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  label: string;

  @IsOptional()
  @IsNumber()
  ordering?: number;
}
