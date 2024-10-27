import { Controller, Post, Get, Body, Query, Res } from '@nestjs/common';
import { KhaltiService } from './khalti.service';
import { Response } from 'express';

@Controller('khalti')
export class KhaltiController {
  constructor(private readonly khaltiService: KhaltiService) {}

  @Post('initialize-payment')
  async initializePayment(@Body() body, @Res() res: Response) {
    const { itemId, totalPrice, website_url } = body;
    try {
      const result = await this.khaltiService.initializePayment(
        itemId,
        totalPrice,
        website_url,
      );
      return res.json(result);
    } catch (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  @Get('complete-payment')
  async completePayment(@Query() query, @Res() res: Response) {
    try {
      const result = await this.khaltiService.verifyAndCompletePayment(query);
      return res.json(result);
    } catch (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
  }
}
