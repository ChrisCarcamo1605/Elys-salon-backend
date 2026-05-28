import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordAndDeviceTokens1779400000000
  implements MigrationInterface
{
  name = 'AddPasswordAndDeviceTokens1779400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "password_hash" character varying(255)`,
    );

    await queryRunner.query(`
      CREATE TABLE "device_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "token_hash" character varying(255) NOT NULL,
        "user_id" uuid NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz,
        "ip" character varying(45),
        "user_agent" character varying(500),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_device_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "uq_device_tokens_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "fk_device_tokens_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_device_tokens_user_expires" ON "device_tokens" ("user_id", "expires_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_device_tokens_user_expires"`);
    await queryRunner.query(`DROP TABLE "device_tokens"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "password_hash"`,
    );
  }
}
