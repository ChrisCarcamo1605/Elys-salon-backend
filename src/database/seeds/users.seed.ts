import * as argon2 from 'argon2';
import { DataSource } from 'typeorm';
import { User } from '../../modules/staff/entities/user.entity';
import { Role, UserStatus, PayType } from '../../common/enums';

const PEPPER = process.env.PIN_PEPPER ?? '';
const ARGON2_OPTS: argon2.Options = { type: argon2.argon2id };

export async function seedUsers(ds: DataSource): Promise<User[]> {
  const repo = ds.getRepository(User);

  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD ?? 'ElySalon2026$1605';
  const adminEmail =
    process.env.SEED_ADMIN_EMAIL ?? 'ely@elyssalon.sv';

  const existing = await repo.count();

  if (existing > 0) {
    // Patch active admins: set email + passwordHash if missing
    const admins = await repo.find({
      where: { role: Role.ADMIN, status: UserStatus.ACTIVA },
    });
    for (const admin of admins) {
      let dirty = false;
      if (!admin.email) { admin.email = adminEmail; dirty = true; }
      if (!admin.passwordHash) {
        admin.passwordHash = await argon2.hash(adminPassword + PEPPER, ARGON2_OPTS);
        dirty = true;
      }
      if (dirty) await repo.save(admin);
    }

    if (process.env.NODE_ENV !== 'production') {
      await ensureDevEmployee(repo, PEPPER);
    }

    return repo.find();
  }

  const systemPinHash = await argon2.hash('4859' + PEPPER, ARGON2_OPTS);
  const adminPinHash = await argon2.hash('1234' + PEPPER, ARGON2_OPTS);
  const adminPasswordHash = await argon2.hash(
    adminPassword + PEPPER,
    ARGON2_OPTS,
  );

  const system = repo.create({
    name: 'Sistema',
    role: Role.ADMIN,
    pinHash: systemPinHash,
    initials: 'SI',
    color: '#6b7280',
    position: 'Sistema',
    status: UserStatus.INACTIVA,
    payType: PayType.SALARIO,
    salary: 0,
    commissionRate: 0,
    phone: '0000000000',
    permissions: {},
  });

  const admin = repo.create({
    name: 'Ely Mojica',
    role: Role.ADMIN,
    pinHash: adminPinHash,
    passwordHash: adminPasswordHash,
    email: adminEmail,
    initials: 'EM',
    color: '#de0fab',
    position: 'Propietaria',
    status: UserStatus.ACTIVA,
    payType: PayType.SALARIO,
    salary: 0,
    commissionRate: 0,
    avatarHue: 300,
    permissions: {},
  });

  const saved = await repo.save([system, admin]);

  if (process.env.NODE_ENV !== 'production') {
    await ensureDevEmployee(repo, PEPPER);
  }

  return saved;
}

async function ensureDevEmployee(
  repo: import('typeorm').Repository<User>,
  pepper: string,
): Promise<void> {
  const exists = await repo.findOne({
    where: { role: Role.EMPLEADO, status: UserStatus.ACTIVA },
  });
  if (exists) return;

  const pinHash = await argon2.hash('2222' + pepper, ARGON2_OPTS);
  await repo.save(
    repo.create({
      name: 'María García',
      role: Role.EMPLEADO,
      pinHash,
      initials: 'MG',
      color: '#0fb0de',
      position: 'Empleada',
      status: UserStatus.ACTIVA,
      payType: PayType.SALARIO,
      salary: 0,
      commissionRate: 0,
      avatarHue: 200,
      permissions: {},
    }),
  );
}
