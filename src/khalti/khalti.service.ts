import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { PurchasedItem } from './entities/purchased-item.entity';
import { Item } from './entities/item.entity';

@Injectable()
export class KhaltiService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(PurchasedItem)
    private purchasedItemRepo: Repository<PurchasedItem>,
    @InjectRepository(Item) private itemRepo: Repository<Item>,
  ) {}

  async initializePayment(
    itemId: string,
    totalPrice: number,
    websiteUrl: string,
  ) {
    const item = await this.itemRepo.findOneBy({ id: itemId });

    if (!item || item.price !== totalPrice)
      throw new Error('Item not found or price mismatch');

    const purchase = this.purchasedItemRepo.create({
      item,
      totalPrice,
      paymentMethod: 'khalti',
    });
    await this.purchasedItemRepo.save(purchase);

    const paymentDetails = {
      amount: totalPrice * 100,
      purchase_order_id: purchase.id,
      purchase_order_name: item.name,
      return_url: `${this.configService.get('BACKEND_URI')}/khalti/complete-payment`,
      website_url: websiteUrl,
    };

    const paymentResponse = await this.httpService
      .post(
        `${this.configService.get('KHALTI_GATEWAY_URL')}/api/v2/epayment/initiate/`,
        paymentDetails,
        {
          headers: {
            Authorization: `Key ${this.configService.get('KHALTI_SECRET_KEY')}`,
            'Content-Type': 'application/json',
          },
        },
      )
      .toPromise();

    return { purchase, payment: paymentResponse.data };
  }

  async verifyAndCompletePayment(query: any) {
    const { pidx, transaction_id, amount, purchase_order_id } = query;

    const paymentInfo = await this.httpService
      .post(
        `${this.configService.get('KHALTI_GATEWAY_URL')}/api/v2/epayment/lookup/`,
        { pidx },
        {
          headers: {
            Authorization: `Key ${this.configService.get('KHALTI_SECRET_KEY')}`,
            'Content-Type': 'application/json',
          },
        },
      )
      .toPromise();

    if (
      paymentInfo.data.status !== 'Completed' ||
      paymentInfo.data.transaction_id !== transaction_id
    ) {
      throw new Error('Payment not completed or information mismatch');
    }

    const purchasedItem =
      await this.purchasedItemRepo.findOne(purchase_order_id);
    if (!purchasedItem) throw new Error('Purchased item not found');

    purchasedItem.status = 'completed';
    await this.purchasedItemRepo.save(purchasedItem);

    const paymentRecord = this.paymentRepo.create({
      pidx,
      transactionId: transaction_id,
      productId: purchasedItem,
      amount,
      dataFromVerificationReq: paymentInfo.data,
      apiQueryFromUser: query,
      paymentGateway: 'khalti',
      status: 'success',
    });
    await this.paymentRepo.save(paymentRecord);

    return { success: true, paymentRecord };
  }
}
