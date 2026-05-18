import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ItemType } from '../../../common/enums';
import { Category } from '../../categories/entities/category.entity';

@Entity('catalog_items')
@Index('idx_catalog_category_active', ['categoryId', 'active'])
@Index('uniq_sku', ['sku'], { where: 'sku IS NOT NULL' })
export class CatalogItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string;

  @Column({ type: 'char', length: 1 })
  type: ItemType;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  cost: number;

  @Column({ nullable: true })
  image: string;

  @Column({ length: 20, nullable: true })
  duration: string;

  @Column({ nullable: true })
  stock: number;

  @Column({ name: 'stock_min', nullable: true })
  stockMin: number;

  @Column({ name: 'alert_enabled', default: true })
  alertEnabled: boolean;

  @Column({ length: 100, nullable: true })
  brand: string;

  @Column({ length: 60, nullable: true })
  sku: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}