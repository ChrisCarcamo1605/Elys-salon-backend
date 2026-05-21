import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('permissions_matrix')
export class PermissionsMatrix {
  @PrimaryColumn({ length: 120 })
  perm: string;

  @Column({ default: false })
  admin: boolean;

  @Column({ default: false })
  empleado: boolean;
}
