import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimeEntrySource } from '../../../common/enums';
import { User } from '../../staff/entities/user.entity';

@Entity('time_entries')
@Index('idx_time_user_date', ['userId', 'date'])
export class TimeEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'in_at', type: 'time' })
  inAt: string;

  @Column({ name: 'out_at', type: 'time', nullable: true })
  outAt: string | null;

  @Column({ name: 'duration_mins', type: 'integer', nullable: true })
  durationMins: number | null;

  @Column({ type: 'enum', enum: TimeEntrySource, default: TimeEntrySource.UI })
  source: TimeEntrySource;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'edited_by_id' })
  editedBy: User | null;

  @Column({ name: 'edited_by_id', type: 'uuid', nullable: true })
  editedById: string | null;
}
