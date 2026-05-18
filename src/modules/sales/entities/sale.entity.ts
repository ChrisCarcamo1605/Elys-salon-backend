import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SaleStatus } from '../../../common/enums';
import { User } from '../../staff/entities/user.entity';
import { SaleLine } from './sale-line.entity';
import { SalePayment } from './sale-payment.entity';

@Entity('sales')
@Index('idx_sales_employee_date_status', ['employeeId', 'createdAt', 'status'])
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', generated: 'increment' })
  number: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'employee_id' })
  employee: User;

  @Column({ name: 'employee_id' })
  employeeId: string;

  @OneToMany(() => SaleLine, (line) => line.sale)
  lines: SaleLine[];

  @OneToMany(() => SalePayment, (payment) => payment.sale)
  payments: SalePayment[];

  @Column({ name: 'customer_name', length: 120, nullable: true })
  customerName: string;

  @Column({ name: 'customer_phone', length: 20, nullable: true })
  customerPhone: string;

  @Column({ name: 'customer_is_new', default: false })
  customerIsNew: boolean;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  subtotal: number;

  @Column({
    name: 'discount_total',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
  })
  discountTotal: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  tip: number;

  @Column({ type: 'enum', enum: SaleStatus, default: SaleStatus.COMPLETED })
  status: SaleStatus;

  @Column({ name: 'voided_at', type: 'timestamptz', nullable: true })
  voidedAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'voided_by_id' })
  voidedBy: User | null;

  @Column({ name: 'voided_by_id', type: 'uuid', nullable: true })
  voidedById: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
