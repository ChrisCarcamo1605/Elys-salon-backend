import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 1. Añade el período de reinicio diario a las metas: una empleada que lleva
 *    $60 de una meta de $75 arranca en 0 al día siguiente.
 * 2. Añade el permiso 'products.cost.read'. Sin él no viaja el costo de compra
 *    (catalog_items.cost, inventory_entries.unit_cost/total_cost) en ninguna
 *    respuesta, así que la empleada solo ve el precio final de venta.
 * 3. Habilita 'inventory.create' por defecto al rol empleado: puede registrar
 *    entradas de stock, valorizadas con el costo que ya tiene el producto.
 */
export class AddDailyGoalResetAndCostPermission1779800000000
  implements MigrationInterface
{
  name = 'AddDailyGoalResetAndCostPermission1779800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."goals_resetperiod_enum" RENAME TO "goals_resetperiod_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."goals_resetperiod_enum" AS ENUM('daily', 'monthly', 'biweekly', 'none')`,
    );
    await queryRunner.query(
      `ALTER TABLE "goals" ALTER COLUMN "resetPeriod" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "goals" ALTER COLUMN "resetPeriod" TYPE "public"."goals_resetperiod_enum" USING "resetPeriod"::"text"::"public"."goals_resetperiod_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "goals" ALTER COLUMN "resetPeriod" SET DEFAULT 'monthly'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."goals_resetperiod_enum_old"`,
    );

    await queryRunner.query(
      `INSERT INTO "permissions_matrix" ("perm", "admin", "empleado")
       VALUES ('products.cost.read', true, false)
       ON CONFLICT ("perm") DO NOTHING`,
    );
    await queryRunner.query(
      `UPDATE "permissions_matrix" SET "empleado" = true WHERE "perm" = 'inventory.create'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "permissions_matrix" SET "empleado" = false WHERE "perm" = 'inventory.create'`,
    );
    await queryRunner.query(
      `DELETE FROM "permissions_matrix" WHERE "perm" = 'products.cost.read'`,
    );

    // Las metas diarias pasan a mensuales: 'daily' deja de existir en el enum.
    await queryRunner.query(
      `UPDATE "goals" SET "resetPeriod" = 'monthly' WHERE "resetPeriod" = 'daily'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."goals_resetperiod_enum" RENAME TO "goals_resetperiod_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."goals_resetperiod_enum" AS ENUM('monthly', 'biweekly', 'none')`,
    );
    await queryRunner.query(
      `ALTER TABLE "goals" ALTER COLUMN "resetPeriod" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "goals" ALTER COLUMN "resetPeriod" TYPE "public"."goals_resetperiod_enum" USING "resetPeriod"::"text"::"public"."goals_resetperiod_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "goals" ALTER COLUMN "resetPeriod" SET DEFAULT 'monthly'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."goals_resetperiod_enum_old"`,
    );
  }
}
