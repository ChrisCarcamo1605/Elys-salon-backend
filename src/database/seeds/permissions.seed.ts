import { DataSource } from 'typeorm';
import { PermissionsMatrix } from '../../modules/permissions/entities/permissions-matrix.entity';

interface PermDef {
  perm: string;
  admin: boolean;
  empleado: boolean;
}

const PERMISSIONS: PermDef[] = [
  // Ventas
  { perm: 'tickets.create',            admin: true, empleado: true  },
  { perm: 'tickets.read',              admin: true, empleado: false },
  { perm: 'tickets.void',              admin: true, empleado: false },
  { perm: 'tickets.discount',          admin: true, empleado: false },
  // Reportes y analíticas
  { perm: 'reports.read',              admin: true, empleado: false },
  { perm: 'analytics.read',            admin: true, empleado: false },
  // Inventario
  { perm: 'inventory.read',            admin: true, empleado: true  },
  { perm: 'inventory.create',          admin: true, empleado: false },
  { perm: 'inventory.adjust',          admin: true, empleado: false },
  // Plantilla
  { perm: 'users.read',                admin: true, empleado: false },
  { perm: 'users.write',               admin: true, empleado: false },
  { perm: 'users.delete',              admin: true, empleado: false },
  { perm: 'users.permissions.manage',  admin: true, empleado: false },
  // Nómina
  { perm: 'payroll.read',              admin: true, empleado: false },
  // Asistencia
  { perm: 'attendance.read_all',       admin: true, empleado: false },
  // Auditoría
  { perm: 'audit.read',                admin: true, empleado: false },
  // Metas y bonos
  { perm: 'bonuses.manage',            admin: true, empleado: false },
  // Promociones
  { perm: 'offers.write',              admin: true, empleado: false },
  // Catálogo
  { perm: 'products.write',            admin: true, empleado: false },
  { perm: 'categories.write',          admin: true, empleado: false },
];



export async function seedPermissions(
  ds: DataSource,
): Promise<PermissionsMatrix[]> {
  const repo = ds.getRepository(PermissionsMatrix);



  for (const p of PERMISSIONS) {
    await repo.save({ perm: p.perm, admin: p.admin, empleado: p.empleado });
  }

  return repo.find({ order: { perm: 'ASC' } });
}
