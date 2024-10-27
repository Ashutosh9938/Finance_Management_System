// src/finance/finance.service.ts
import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateFinanceDto } from './dto/create-finance.dto';
import { UpdateFinanceDto } from './dto/update-finance.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Finance } from './entities/finance.entity';
import { calculateFees } from '../utils/calculate-fee';
import { uploadSingleFileToCloudinary } from '../utils/file-upload.helper';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(Finance)
    private readonly financeRepository: Repository<Finance>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async create(createFinanceDto: CreateFinanceDto, file?: Express.Multer.File) {
    let agreementFileUrl: string | null = null;

    if (file) {
      const uploadedFile = await uploadSingleFileToCloudinary(
        file,
        'agreements',
      );
      agreementFileUrl = uploadedFile.secure_url;
    }

    const { anualFee, monthlyFee, total, totalInWords } = calculateFees({
      registrationFee: createFinanceDto.registrationFee,
      examinationFee: createFinanceDto.examinationFee,
      admissionFee: createFinanceDto.admissionFee,
      securityDeposite: createFinanceDto.securityDeposite,
      otherCharges: createFinanceDto.otherCharges,
      tax: createFinanceDto.tax,
      extraCharges: createFinanceDto.extraCharges,
      discount: createFinanceDto.discount,
    });

    const finance = this.financeRepository.create({
      ...createFinanceDto,
      anualFee,
      monthlyFee,
      total,
      amountInWords: totalInWords,
      agreementFile: agreementFileUrl,
      remainingBalance: parseFloat(anualFee), // Initialize remaining balance with annual fee
    });

    return await this.financeRepository.save(finance);
  }

  async findAll(): Promise<Finance[]> {
    return await this.financeRepository.find();
  }

  async findOne(id: string): Promise<Finance> {
    const finance = await this.financeRepository.findOne({ where: { id } });
    if (!finance)
      throw new NotFoundException(`Finance record with ID ${id} not found`);
    return finance;
  }

  async initiatePayment(id: string, amount: number, months: string[]) {
    const finance = await this.findOne(id);

    // Convert the amount to paisa for Khalti (1 rupee = 100 paisa)
    const khaltiAmount = amount * 100;

    // Check if the amount is within Khalti's required range in paisa
    if (khaltiAmount < 1000 || khaltiAmount > 100000) {
      throw new Error('Amount must be between Rs 10 and Rs 1000');
    }

    // Define the Khalti payment URL
    const khaltiUrl = `${this.configService.get('KHALTI_GATEWAY_URL')}/api/v2/epayment/initiate/`;

    // Set up the headers for the HTTP request
    const headers = {
      Authorization: `Key ${this.configService.get('KHALTI_SECRET_KEY')}`,
      'Content-Type': 'application/json',
    };

    const paymentData = {
      amount: khaltiAmount,
      purchase_order_id: finance.id,
      purchase_order_name: 'Finance Payment',
      return_url: `${this.configService.get('BACKEND_URI')}/finance/verify-payment`,
      website_url: this.configService.get('FRONTEND_URI'),
    };

    console.log('Adjusted Payment Data:', paymentData);

    try {
      // Make the HTTP request to initiate payment with Khalti
      const { data } = await firstValueFrom(
        this.httpService.post(khaltiUrl, paymentData, { headers }),
      );

      // Store the `pidx` for payment verification
      finance.pidx = data.pidx;
      finance.unpaidMonths = finance.unpaidMonths.concat(
        months.filter((month) => !finance.paidMonths.includes(month)),
      );
      await this.financeRepository.save(finance);

      // Return the payment URL to redirect the user to Khalti for payment
      return { paymentUrl: data.payment_url };
    } catch (error) {
      console.error('Error response data:', error.response?.data);
      throw new Error(
        error.response?.data?.detail || 'Payment initiation failed',
      );
    }
  }

  async verifyPayment(pidx: string) {
    console.log(`Verifying payment with pidx: ${pidx}`);

    // Validate the `pidx` and check if it's associated with a finance record
    const finance = await this.financeRepository.findOne({ where: { pidx } });
    if (!finance) {
      console.error(`No finance record found for pidx: ${pidx}`);
      throw new NotFoundException('Finance record not found for this payment');
    }

    const url = `${this.configService.get('KHALTI_GATEWAY_URL')}/api/v2/epayment/lookup/`;
    const headers = {
      Authorization: `Key ${this.configService.get('KHALTI_SECRET_KEY')}`,
      'Content-Type': 'application/json',
    };
    const body = { pidx };

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, body, { headers }),
      );

      console.log('Khalti Response:', response.data);

      if (response.data.status === 'Completed') {
        const amountPaid = response.data.total_amount / 100;
        finance.remainingBalance -= amountPaid;

        finance.paidMonths = finance.paidMonths.concat(finance.unpaidMonths);
        finance.unpaidMonths = [];
        finance.paymentStatus = 'completed';

        await this.financeRepository.save(finance);

        return {
          success: true,
          message: 'Payment completed successfully',
          remainingBalance: finance.remainingBalance,
        };
      } else {
        throw new Error('Payment not completed');
      }
    } catch (error) {
      console.error('Error during payment verification:', error.message);
      throw new InternalServerErrorException(
        error.response?.data?.detail || 'Payment verification failed',
      );
    }
  }


  async update(id: string, updateFinanceDto: UpdateFinanceDto, file?: any) {
    const finance = await this.findOne(id);

    let agreementFileUrl: string | null = finance.agreementFile;
    if (file) {
      const uploadedFile = await uploadSingleFileToCloudinary(
        file,
        'agreements',
      );
      agreementFileUrl = uploadedFile.secure_url;
    }

    const { anualFee, monthlyFee, total, totalInWords } = calculateFees({
      registrationFee:
        updateFinanceDto.registrationFee || finance.registrationFee,
      examinationFee: updateFinanceDto.examinationFee || finance.examinationFee,
      admissionFee: updateFinanceDto.admissionFee || finance.admissionFee,
      securityDeposite:
        updateFinanceDto.securityDeposite || finance.securityDeposite,
      otherCharges: updateFinanceDto.otherCharges || finance.otherCharges,
      tax: updateFinanceDto.tax || finance.tax,
      extraCharges: updateFinanceDto.extraCharges || finance.extraCharges,
      discount: updateFinanceDto.discount || finance.discount,
    });

    Object.assign(finance, {
      ...updateFinanceDto,
      anualFee,
      monthlyFee,
      total,
      amountInWords: totalInWords,
      agreementFile: agreementFileUrl,
    });

    return await this.financeRepository.save(finance);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.financeRepository.delete(id);
    return {
      message: `Finance record with id ${id} has been deleted successfully`,
    };
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async updateUnpaidMonths() {
    const allFinances = await this.financeRepository.find();
    const previousMonth = new Date(
      new Date().setMonth(new Date().getMonth() - 1),
    ).toLocaleString('default', { month: 'long' });

    for (const finance of allFinances) {
      if (
        !finance.paidMonths.includes(previousMonth) &&
        !finance.unpaidMonths.includes(previousMonth)
      ) {
        finance.unpaidMonths.push(previousMonth);
        await this.financeRepository.save(finance);
      }
    }
  }
}
