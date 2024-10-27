import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KhaltiService } from './khalti.service';
import { KhaltiController } from './khalti.controller';
import { Item } from './entities/item.entity';
import { PurchasedItem } from './entities/purchased-item.entity';
import { Payment } from './entities/payment.entity';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    TypeOrmModule.forFeature([Item, PurchasedItem, Payment]),
  ],
  providers: [KhaltiService],
  controllers: [KhaltiController],
})
export class KhaltiModule {}
