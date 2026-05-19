import * as argon2 from 'argon2';
import { DataSource } from 'typeorm';
import { User } from '../../modules/staff/entities/user.entity';
import { Role, UserStatus, PayType } from '../../common/enums';

const PEPPER = process.env.PIN_PEPPER ?? '';

export async function seedUsers(ds: DataSource): Promise<User[]> {
  const repo = ds.getRepository(User);

  const existing = await repo.count();
  if (existing > 0) return repo.find();

  const systemPinHash = await argon2.hash(
    '4859' + PEPPER
  );
  const adminPinHash = await argon2.hash('1234' + PEPPER);

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


  return repo.save([system, admin]);
}
