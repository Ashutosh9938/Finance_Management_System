// src/finance/finance.controller.ts
import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { Express } from 'express';
import { CreateFinanceDto } from './dto/create-finance.dto';
import { UpdateFinanceDto } from './dto/update-finance.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() createFinanceDto: CreateFinanceDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.financeService.create(createFinanceDto, file);
  }

  @Get()
  findAll() {
    return this.financeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.financeService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Param('id') id: string,
    @Body() updateFinanceDto: UpdateFinanceDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.financeService.update(id, updateFinanceDto, file);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.financeService.remove(id);
  }

  @Post(':id/initiate-payment')
  async initiatePayment(
    @Param('id') id: string,
    @Body('amount') amount: number,
    @Body('months') months: string[],
  ) {
    return this.financeService.initiatePayment(id, amount, months);
  }

  // Ensure correct use of `@Query` for pidx parameter
  @Get('verify-payment')
  async verifyPayment(@Query('pidx') pidx: string) {
    console.log(`Received pidx: ${pidx}`); // Debugging log to confirm pidx
    return this.financeService.verifyPayment(pidx);
  }
}
