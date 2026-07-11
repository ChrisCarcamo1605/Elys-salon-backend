import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeviceTokenScope1779500000000 implements MigrationInterface {
  name = 'AddDeviceTokenScope1779500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."device_tokens_scope_enum" AS ENUM('admin', 'empleado')`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_tokens" ADD COLUMN "scope" "public"."device_tokens_scope_enum" NOT NULL DEFAULT 'empleado'`,
    );

    // Backfill: tokens ya emitidos a usuarias admin conservan alcance admin.
    await queryRunner.query(`
      UPDATE "device_tokens" dt
      SET "scope" = 'admin'
      FROM "users" u
      WHERE dt.user_id = u.id AND u.role = 'admin'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "device_tokens" DROP COLUMN "scope"`);
    await queryRunner.query(`DROP TYPE "public"."device_tokens_scope_enum"`);
  }
}
