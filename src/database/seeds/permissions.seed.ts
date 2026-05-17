import { DataSource } from 'typeorm';
import { Permission } from '../../modules/rbac/entities/permission.entity';

interface PermissionDef {
  code: string;
  description: string;
}

export const PERMISSION_DEFINITIONS: PermissionDef[] = [
  // Users
  { code: 'users.read', description: 'Listar y ver usuarios' },
  { code: 'users.write', description: 'Crear y actualizar usuarios' },
  { code: 'users.delete', description: 'Desactivar usuarios' },
  {
    code: 'users.permissions.manage',
    description: 'Asignar/revocar permisos especiales',
  },

  // Products / Services
  { code: 'products.read', description: 'Listar productos' },
  { code: 'products.write', description: 'Crear/modificar productos' },
  { code: 'services.read', description: 'Listar servicios' },
  { code: 'services.write', description: 'Crear/modificar servicios' },
  { code: 'categories.write', description: 'Gestionar categorías' },

  // Tickets / Sales
  { code: 'tickets.create', description: 'Crear ventas y tickets' },
  { code: 'tickets.read', description: 'Listar y ver tickets' },
  {
    code: 'tickets.modify',
    description: 'Modificar items/precios de tickets (solo system)',
  },
  { code: 'tickets.void', description: 'Anular tickets' },
  {
    code: 'tickets.price_override',
    description: 'Aplicar precio especial en venta',
  },

  // Inventory
  { code: 'inventory.read', description: 'Consultar inventario' },
  {
    code: 'inventory.create',
    description: 'Registrar entradas/ajustes de inventario',
  },
  { code: 'inventory.adjust', description: 'Ajustes manuales de stock' },

  // Expenses
  { code: 'expenses.read', description: 'Consultar gastos' },
  { code: 'expenses.create', description: 'Registrar gastos' },

  // Payroll
  { code: 'payroll.manage', description: 'Gestionar planilla y pagos' },
  { code: 'payroll.read', description: 'Consultar planilla' },

  // Offers
  { code: 'offers.read', description: 'Listar ofertas' },
  { code: 'offers.write', description: 'Crear/modificar ofertas' },

  // Attendance
  { code: 'attendance.check_in', description: 'Hacer check-in' },
  { code: 'attendance.read_all', description: 'Ver asistencias de todos' },

  // Bonuses
  { code: 'bonuses.read', description: 'Consultar bonos' },
  { code: 'bonuses.manage', description: 'Crear/configurar metas de bonos' },

  // Reports
  { code: 'reports.read', description: 'Descargar reportes' },
  { code: 'reports.generate', description: 'Generar reportes manualmente' },

  // Analytics
  { code: 'analytics.read', description: 'Acceder a analíticas' },

  // Audit
  { code: 'audit.read', description: 'Consultar log de auditoría' },
];

export async function seedPermissions(ds: DataSource): Promise<Permission[]> {
  const repo = ds.getRepository(Permission);
  const existing = await repo.find();
  const existingCodes = new Set(existing.map((p) => p.code));

  const toInsert = PERMISSION_DEFINITIONS.filter(
    (d) => !existingCodes.has(d.code),
  );
  if (toInsert.length > 0) {
    await repo.insert(toInsert);
  }

  // sync descriptions
  for (const def of PERMISSION_DEFINITIONS) {
    await repo.update({ code: def.code }, { description: def.description });
  }

  return repo.find();
}
