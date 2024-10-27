import { IsString, IsUrl, IsInt, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CustomerInfoDto {
  @IsString()
  name: string;

  @IsString()
  email: string;

  @IsString()
  phone: string;
}

class AmountBreakdownDto {
  @IsString()
  label: string;

  @IsInt()
  amount: number;
}

export class InitiatePaymentDto {
  @IsUrl()
  return_url: string;

  @IsUrl()
  website_url: string;

  @IsInt()
  amount: number;

  @IsString()
  purchase_order_id: string;

  @IsString()
  purchase_order_name: string;

  @ValidateNested()
  @Type(() => CustomerInfoDto)
  customer_info?: CustomerInfoDto;

  @ValidateNested({ each: true })
  @Type(() => AmountBreakdownDto)
  amount_breakdown?: AmountBreakdownDto[];
}
