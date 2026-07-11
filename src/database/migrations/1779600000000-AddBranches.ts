import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBranches1779600000000 implements MigrationInterface {
  name = 'AddBranches1779600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "branches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(120) NOT NULL,
        "address" character varying(255),
        "phone" character varying(20),
        "timezone" character varying(60) NOT NULL DEFAULT 'America/El_Salvador',
        "active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_branches" PRIMARY KEY ("id")
      )
    `);

    // Sucursal por defecto: evita dejar huérfanos al personal y ventas ya existentes.
    await queryRunner.query(
      `INSERT INTO "branches" ("name") VALUES ('Principal')`,
    );

    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "branch_id" uuid`);
    await queryRunner.query(`
      UPDATE "users" SET "branch_id" = (SELECT "id" FROM "branches" LIMIT 1)
      WHERE "role" != 'admin'
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "fk_users_branch"
        FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`ALTER TABLE "sales" ADD COLUMN "branch_id" uuid`);
    await queryRunner.query(`
      UPDATE "sales" SET "branch_id" = (SELECT "id" FROM "branches" LIMIT 1)
    `);
    await queryRunner.query(`
      ALTER TABLE "sales" ADD CONSTRAINT "fk_sales_branch"
        FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_sales_branch_date_status" ON "sales" ("branch_id", "created_at", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_sales_branch_date_status"`);
    await queryRunner.query(
      `ALTER TABLE "sales" DROP CONSTRAINT "fk_sales_branch"`,
    );
    await queryRunner.query(`ALTER TABLE "sales" DROP COLUMN "branch_id"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "fk_users_branch"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "branch_id"`);
    await queryRunner.query(`DROP TABLE "branches"`);
  }
}
