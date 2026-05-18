import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CatalogItem } from '../../catalog/entities/catalog-item.entity';

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  name: string;

  @Column({ length: 500, nullable: true })
  description: string;

  @Column({ length: 40 })
  off: string;

  @Column({ type: 'jsonb', nullable: true })
  rule: Record<string, unknown>;

  @Column({ default: true })
  active: boolean;

  @ManyToMany(() => CatalogItem, (item) => item.promotions, { eager: false })
  @JoinTable({
    name: 'promotion_items',
    joinColumn: { name: 'promotion_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'item_id', referencedColumnName: 'id' },
  })
  items: CatalogItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
