import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('settings')
export class Setting {
  @PrimaryColumn({ length: 60 })
  key: string;

  @Column({ type: 'jsonb' })
  value: Record<string, unknown>;
}