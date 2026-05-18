import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DiscountKind, ItemType } from '../../../common/enums';
import { Sale } from './sale.entity';
import { User } from '../../staff/entities/user.entity';
import { CatalogItem } from '../../catalog/entities/catalog-item.entity';

@Entity('sale_lines')
export class SaleLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Sale, { onDelete: 'CASCADE' })
  sale: Sale;

  @Column({ name: 'sale_id' })
  saleId: string;

  @ManyToOne(() => CatalogItem)
  item: CatalogItem;

  @Column({ name: 'item_id' })
  itemId: string;

  @Column({ name: 'item_type', type: 'char', length: 1 })
  itemType: ItemType;

  @Column({ name: 'item_name', length: 200 })
  itemName: string;

  @Column({ name: 'base_price', type: 'numeric', precision: 10, scale: 2 })
  basePrice: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  price: number;

  @Column({ default: 1 })
  qty: number;

  @Column({ name: 'discount_kind', type: 'enum', enum: DiscountKind, nullable: true })
  discountKind: DiscountKind;

  @Column({ name: 'discount_value', type: 'numeric', precision: 10, scale: 2, default: 0 })
  discountValue: number;

  @ManyToOne(() => User, { nullable: true })
  discountBy: User | null;

  @Column({ name: 'discount_by', type: 'uuid', nullable: true })
  discountById: string | null;
}