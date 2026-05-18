import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentMethod } from '../../../common/enums';
import { Sale } from './sale.entity';

@Entity('sale_payments')
export class SalePayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Sale, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @Column({ name: 'sale_id' })
  saleId: string;

  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'card_last4', length: 4, nullable: true })
  cardLast4: string;

  @Column({ name: 'card_brand', length: 20, nullable: true })
  cardBrand: string;

  @Column({ name: 'auth_code', length: 50, nullable: true })
  authCode: string;
}
