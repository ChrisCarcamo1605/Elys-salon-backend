import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { InventoryKind, AdjustmentReason } from '../../../common/enums';
import { CatalogItem } from '../../catalog/entities/catalog-item.entity';
import { User } from '../../staff/entities/user.entity';

@Entity('inventory_entries')
@Index('idx_inventory_product_date', ['productId', 'createdAt'])
export class InventoryEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CatalogItem)
  product: CatalogItem;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ type: 'enum', enum: InventoryKind })
  kind: InventoryKind;

  @Column({ name: 'qty_delta' })
  qtyDelta: number;

  @Column({ name: 'stock_after' })
  stockAfter: number;

  @Column({ name: 'unit_cost', type: 'numeric', precision: 10, scale: 2, default: 0 })
  unitCost: number;

  @Column({ name: 'total_cost', type: 'numeric', precision: 10, scale: 2, default: 0 })
  totalCost: number;

  @Column({ length: 120, nullable: true })
  supplier: string;

  @Column({ length: 60, nullable: true })
  invoice: string;

  @Column({ type: 'enum', enum: AdjustmentReason, nullable: true })
  reason: AdjustmentReason;

  @Column({ nullable: true })
  notes: string;

  @ManyToOne(() => User, { nullable: true })
  createdBy: User;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}