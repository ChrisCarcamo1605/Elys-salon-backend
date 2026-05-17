import { DataSource } from 'typeorm';
import { RoleName } from '../../common/enums';
import { Permission } from '../../modules/rbac/entities/permission.entity';
import { Role } from '../../modules/rbac/entities/role.entity';

interface RoleDef {
  name: RoleName;
  level: number;
  permissionCodes: string[] | '*';
}

const ROLE_DEFINITIONS: RoleDef[] = [
  { name: RoleName.SYSTEM, level: 100, permissionCodes: '*' },
  {
    name: RoleName.ADMIN,
    level: 80,
    permissionCodes: [
      'users.read',
      'users.write',
      'users.delete',
      'users.permissions.manage',
      'products.read',
      'products.write',
      'services.read',
      'services.write',
      'categories.write',
      'tickets.create',
      'tickets.read',
      'tickets.void',
      'tickets.price_override',
      'inventory.read',
      'inventory.create',
      'inventory.adjust',
      'expenses.read',
      'expenses.create',
      'payroll.manage',
      'payroll.read',
      'offers.read',
      'offers.write',
      'attendance.check_in',
      'attendance.read_all',
      'bonuses.read',
      'bonuses.manage',
      'reports.read',
      'reports.generate',
      'analytics.read',
      'audit.read',
    ],
  },
  {
    name: RoleName.SUPERVISOR,
    level: 60,
    permissionCodes: [
      'users.read',
      'products.read',
      'services.read',
      'tickets.create',
      'tickets.read',
      'inventory.read',
      'inventory.create',
      'expenses.read',
      'payroll.read',
      'offers.read',
      'attendance.check_in',
      'attendance.read_all',
      'bonuses.read',
      'reports.read',
      'analytics.read',
    ],
  },
  {
    name: RoleName.EMPLOYEE,
    level: 20,
    permissionCodes: [
      'products.read',
      'services.read',
      'tickets.create',
      'tickets.read',
      'inventory.read',
      'attendance.check_in',
      'bonuses.read',
    ],
  },
];

export async function seedRoles(
  ds: DataSource,
  allPermissions: Permission[],
): Promise<Role[]> {
  const roleRepo = ds.getRepository(Role);
  const permByCode = new Map(allPermissions.map((p) => [p.code, p]));

  for (const def of ROLE_DEFINITIONS) {
    let role = await roleRepo.findOne({
      where: { name: def.name },
      relations: { permissions: true },
    });
    if (!role) {
      role = roleRepo.create({ name: def.name, level: def.level });
    } else {
      role.level = def.level;
    }

    role.permissions =
      def.permissionCodes === '*'
        ? allPermissions
        : def.permissionCodes
            .map((c) => permByCode.get(c))
            .filter((p): p is Permission => Boolean(p));

    await roleRepo.save(role);
  }

  return roleRepo.find({ relations: { permissions: true } });
}
