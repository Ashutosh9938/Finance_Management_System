import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  BaseEntity,
} from 'typeorm';
import { PurchasedItem } from './purchased-item.entity';

@Entity()
export class Payment extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  transactionId: string;

  @Column({ unique: true })
  pidx: string;

  @ManyToOne(() => PurchasedItem, (purchasedItem) => purchasedItem.id)
  productId: PurchasedItem;

  @Column('decimal')
  amount: number;

  @Column('json', { nullable: true })
  dataFromVerificationReq: object;

  @Column('json', { nullable: true })
  apiQueryFromUser: object;

  @Column({ default: 'khalti' })
  paymentGateway: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  paymentDate: Date;
}
