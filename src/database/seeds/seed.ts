import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { AppDataSource } from '../data-source';
import { seedPermissions } from './permissions.seed';
import { seedCategories } from './categories.seed';
import { seedCatalog } from './catalog.seed';
import { seedUsers } from './users.seed';
import { seedGoals } from './goals.seed';
import { seedSettings } from './settings.seed';
import { seedSales } from './sales.seed';
import { seedAlerts } from './alerts.seed';
import { seedPromotions } from './promotions.seed';
import { seedInventory } from './inventory.seed';
import { seedTimeclock } from './timeclock.seed';
import { seedAudit } from './audit.seed';
import { seedUserPreferences } from './user-preferences.seed';

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

    const catalog = await seedCatalog(AppDataSource);
    console.log(`[seed] ${catalog.length} items de catálogo creados`);

    const goals = await seedGoals(AppDataSource);
    console.log(`[seed] ${goals.length} metas creadas`);

    const settings = await seedSettings(AppDataSource);
    console.log(`[seed] ${settings.length} settings creados`);

    const sales = await seedSales(AppDataSource);
    console.log(`[seed] ${sales.length} ventas creadas`);

    const alerts = await seedAlerts(AppDataSource);
    console.log(`[seed] ${alerts.length} alertas creadas`);

    const promotions = await seedPromotions(AppDataSource);
    console.log(`[seed] ${promotions.length} promociones creadas`);

    const inventory = await seedInventory(AppDataSource);
    console.log(`[seed] ${inventory.length} entradas de inventario creadas`);

    const timeclock = await seedTimeclock(AppDataSource);
    console.log(`[seed] ${timeclock.length} registros de asistencia creados`);

    const audit = await seedAudit(AppDataSource);
    console.log(`[seed] ${audit.length} entradas de auditoría creadas`);

    const prefs = await seedUserPreferences(AppDataSource);
    console.log(`[seed] ${prefs.length} preferencias de usuario creadas`);

    console.log('[seed] OK');
  } catch (err) {
    console.error('[seed] ERROR', err);
    process.exitCode = 1;
  } finally {
    await AppDataSource.destroy();
  }
}

void run();