import { IsOptional, IsString, Length } from 'class-validator';

export class CreateBranchDto {
  @IsString()
  @Length(2, 120)
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
