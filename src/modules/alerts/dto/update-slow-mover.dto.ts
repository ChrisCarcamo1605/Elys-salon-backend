import { IsEnum, IsNumber, IsBoolean, IsOptional } from 'class-validator';
import { DiscountKind } from '../../../common/enums';

export class UpdateSlowMoverDto {
  @IsOptional() @IsEnum(DiscountKind)
  suggestedOfferKind?: DiscountKind;

  @IsOptional() @IsNumber()
  suggestedOfferValue?: number;

  @IsOptional() @IsBoolean()
  offerActive?: boolean;
}