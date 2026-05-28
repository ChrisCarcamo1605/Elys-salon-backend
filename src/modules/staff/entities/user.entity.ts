import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role, UserStatus, PayType } from '../../../common/enums';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  name: string;

  @Column({ type: 'enum', enum: Role, default: Role.EMPLEADO })
  role: Role;

  @Column({ name: 'pin_hash', length: 255 })
  pinHash: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  passwordHash: string | null;

  @Column({ name: 'dev_pin', type: 'varchar', length: 10, nullable: true })
  devPin: string | null;

  @Column({ length: 4, nullable: true })
  initials: string;

  @Column({ length: 7, nullable: true })
  color: string;

  @Column({ length: 80, nullable: true })
  position: string;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVA })
  status: UserStatus;

  @Column({ name: 'hire_date', type: 'date', nullable: true })
  hireDate: Date;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ name: 'birthday', type: 'date', nullable: true })
  birthday: Date;

  @Column({ type: 'jsonb', nullable: true })
  schedule: Record<string, unknown>;

  @Column({
    name: 'pay_type',
    type: 'enum',
    enum: PayType,
    default: PayType.SALARIO,
  })
  payType: PayType;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  salary: number;

  @Column({
    name: 'commission_rate',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0,
  })
  commissionRate: number;

  @Column({ name: 'avatar_hue', nullable: true })
  avatarHue: number;

  @Column({ type: 'jsonb', default: '{}' })
  permissions: Record<string, boolean>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
