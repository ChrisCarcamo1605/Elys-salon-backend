import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { seedPermissions } from './permissions.seed';
import { seedRoles } from './roles.seed';
import { seedSystemUser } from './system-user.seed';

async function run(): Promise<void> {
  await AppDataSource.initialize();
  console.log('[seed] DataSource conectado');

  try {
    const permissions = await seedPermissions(AppDataSource);
    console.log(`[seed] ${permissions.length} permisos sincronizados`);

    const roles = await seedRoles(AppDataSource, permissions);
    console.log(`[seed] ${roles.length} roles sincronizados`);

    await seedSystemUser(AppDataSource);

    console.log('[seed] OK');
  } catch (err) {
    console.error('[seed] ERROR', err);
    process.exitCode = 1;
  } finally {
    await AppDataSource.destroy();
  }
}

void run();
