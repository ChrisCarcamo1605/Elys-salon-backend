import { DataSource } from 'typeorm';
import { PermissionsMatrix } from '../../modules/permissions/entities/permissions-matrix.entity';

interface PermDef {
  perm: string;
  admin: boolean;
  empleada: boolean;
}

const PERMISSIONS: PermDef[] = [
  { perm: 'Modificar precios y descuentos', admin: true, empleada: false },
  { perm: 'Anular ventas', admin: true, empleada: false },
  { perm: 'Gestionar inventario', admin: true, empleada: false },
  { perm: 'Gestionar usuarios', admin: true, empleada: false },
  { perm: 'Ver analíticas', admin: true, empleada: false },
  { perm: 'Gestionar nómina', admin: true, empleada: false },
  { perm: 'Gestionar metas y bonos', admin: true, empleada: false },
  { perm: 'Gestionar promociones', admin: true, empleada: false },
  { perm: 'Gestionar alertas', admin: true, empleada: false },
  { perm: 'Gestionar ajustes', admin: true, empleada: false },
  { perm: 'Ver reportes', admin: true, empleada: false },
  { perm: 'Registrar ventas', admin: true, empleada: true },
  { perm: 'Ver inventario', admin: true,empleada: true },
  { perm: 'Marcar entrada/salida', admin: true, empleada: true },
  { perm: 'Ver progreso propio', admin: true, empleada: true },
];

export async function seedPermissions(ds: DataSource): Promise<PermissionsMatrix[]> {
  const repo = ds.getRepository(PermissionsMatrix);
  for (const p of PERMISSIONS) {
    await repo.save({ perm: p.perm, admin: p.admin, empleada: p.empleada });
  }
  return repo.find({ order: { perm: 'ASC' } });
}