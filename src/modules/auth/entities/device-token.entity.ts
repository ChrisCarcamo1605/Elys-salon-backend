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
import { DeviceTokenScope } from '../../../common/enums';

@Entity('device_tokens')
@Index('idx_device_tokens_user_expires', ['userId', 'expiresAt'])
export class DeviceToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'token_hash', length: 255, unique: true })
  tokenHash: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: DeviceTokenScope,
    default: DeviceTokenScope.EMPLEADO,
  })
  scope: DeviceTokenScope;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ length: 45, nullable: true })
  ip: string;

  @Column({ name: 'user_agent', length: 500, nullable: true })
  userAgent: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
