import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  BaseEntity,
} from 'typeorm';
import { Item } from './item.entity';

@Entity()
export class PurchasedItem extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Item, (item) => item.id)
  item: Item;

  @Column('decimal')
  totalPrice: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  purchaseDate: Date;

  @Column({ default: 'khalti' })
  paymentMethod: string;

  @Column({ default: 'pending' })
  status: string;
}
