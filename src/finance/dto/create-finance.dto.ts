// src/finance/dto/create-finance.dto.ts
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateFinanceDto {
  @IsNotEmpty()
  @IsString()
  registrationFee: string;

  @IsNotEmpty()
  @IsString()
  examinationFee: string;

  @IsNotEmpty()
  @IsString()
  admissionFee: string;

  @IsNotEmpty()
  @IsString()
  securityDeposite: string;

  @IsNotEmpty()
  @IsString()
  otherCharges: string;

  anualFee: string;
  monthlyFee: string;

  @IsOptional()
  @IsString()
  discount?: string;

  @IsNotEmpty()
  @IsString()
  tax: string;

  @IsOptional()
  @IsString()
  extraCharges?: string;

  @IsOptional()
  @IsString()
  total?: string;

  @IsOptional()
  @IsString()
  amountInWords?: string;

  @IsOptional()
  @IsString()
  agreementFile?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
