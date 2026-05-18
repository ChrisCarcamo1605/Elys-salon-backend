import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../staff/entities/user.entity';

@Entity('audit_log')
@Index('idx_audit_user_created', ['userId', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({ length: 20 })
  action: string;

  @Column({ length: 60 })
  resource: string;

  @Column({ name: 'resource_id', length: 40, nullable: true })
  resourceId: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
