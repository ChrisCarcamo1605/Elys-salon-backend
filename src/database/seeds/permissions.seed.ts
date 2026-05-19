import { DataSource } from 'typeorm';
import { PermissionsMatrix } from '../../modules/permissions/entities/permissions-matrix.entity';

interface PermDef {
  perm: string;
  admin: boolean;
  empleada: boolean;
}

const PERMISSIONS: PermDef[] = [
  // Ventas
  { perm: 'tickets.create',            admin: true, empleada: true  },
  { perm: 'tickets.read',              admin: true, empleada: false },
  { perm: 'tickets.void',              admin: true, empleada: false },
  { perm: 'tickets.discount',          admin: true, empleada: false },
  // Reportes y analíticas
  { perm: 'reports.read',              admin: true, empleada: false },
  { perm: 'analytics.read',            admin: true, empleada: false },
  // Inventario
  { perm: 'inventory.read',            admin: true, empleada: true  },
  { perm: 'inventory.create',          admin: true, empleada: false },
  { perm: 'inventory.adjust',          admin: true, empleada: false },
  // Plantilla
  { perm: 'users.read',                admin: true, empleada: false },
  { perm: 'users.write',               admin: true, empleada: false },
  { perm: 'users.delete',              admin: true, empleada: false },
  { perm: 'users.permissions.manage',  admin: true, empleada: false },
  // Nómina
  { perm: 'payroll.read',              admin: true, empleada: false },
  // Asistencia
  { perm: 'attendance.read_all',       admin: true, empleada: false },
  // Auditoría
  { perm: 'audit.read',                admin: true, empleada: false },
  // Metas y bonos
  { perm: 'bonuses.manage',            admin: true, empleada: false },
  // Promociones
  { perm: 'offers.write',              admin: true, empleada: false },
  // Catálogo
  { perm: 'products.write',            admin: true, empleada: false },
  { perm: 'categories.write',          admin: true, empleada: false },
];



export async function seedPermissions(
  ds: DataSource,
): Promise<PermissionsMatrix[]> {
  const repo = ds.getRepository(PermissionsMatrix);



  for (const p of PERMISSIONS) {
    await repo.save({ perm: p.perm, admin: p.admin, empleada: p.empleada });
  }

  return repo.find({ order: { perm: 'ASC' } });
}
