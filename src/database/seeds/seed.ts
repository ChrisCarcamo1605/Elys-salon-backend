import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { AppDataSource } from '../data-source';
import { seedPermissions } from './permissions.seed';
import { seedCategories } from './categories.seed';
import { seedUsers } from './users.seed';
import { seedSettings } from './settings.seed';


async function run(): Promise<void> {
  const envFile = process.env.NODE_ENV === 'production' ? '.env' : '.env.dev';
  config({ path: resolve(__dirname, '../../../..', envFile) });

  await AppDataSource.initialize();
  console.log('[seed] DataSource conectado');

  try {
    await AppDataSource.runMigrations({ transaction: 'all' });
    console.log('[seed] Migraciones ejecutadas');

    const perms = await seedPermissions(AppDataSource);
    console.log(`[seed] ${perms.length} permisos sincronizados`);

    const users = await seedUsers(AppDataSource);
    console.log(`[seed] ${users.length} usuarias creadas`);

    const categories = await seedCategories(AppDataSource);
    console.log(`[seed] ${categories.length} categorías creadas`);

    const settings = await seedSettings(AppDataSource);
    console.log(`[seed] ${settings.length} settings creados`);

    console.log('[seed] OK');
  } catch (err) {
    console.error('[seed] ERROR', err);
    process.exitCode = 1;
  } finally {
    await AppDataSource.destroy();
  }
}

void run();
