import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { RoleName } from '../../common/enums';
import { Role } from '../../modules/rbac/entities/role.entity';
import { User } from '../../modules/users/entities/user.entity';

export async function seedSystemUser(ds: DataSource): Promise<User> {
  const userRepo = ds.getRepository(User);
  const roleRepo = ds.getRepository(Role);

  const email = process.env.SYSTEM_USER_EMAIL;
  const password = process.env.SYSTEM_USER_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'SYSTEM_USER_EMAIL y SYSTEM_USER_PASSWORD son requeridos en el .env',
    );
  }

  const systemRole = await roleRepo.findOneByOrFail({ name: RoleName.SYSTEM });
  const cost = parseInt(process.env.BCRYPT_COST ?? '12', 10);

  let user = await userRepo.findOne({ where: { email: email.toLowerCase() } });
  if (!user) {
    const passwordHash = await bcrypt.hash(password, cost);
    user = userRepo.create({
      email: email.toLowerCase(),
      passwordHash,
      fullName: 'System Administrator',
      roleId: systemRole.id,
      active: true,
    });
    user = await userRepo.save(user);
    console.log(`[seed] System user creado: ${email}`);
  } else {
    user.roleId = systemRole.id;
    user.active = true;
    await userRepo.save(user);
    console.log(
      `[seed] System user ya existía, rol/estado sincronizados: ${email}`,
    );
  }

  return user;
}
