import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoalResetPeriod1779300000000 implements MigrationInterface {
  name = 'AddGoalResetPeriod1779300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."goals_resetperiod_enum" AS ENUM('monthly', 'biweekly', 'none')`,
    );
    await queryRunner.query(
      `ALTER TABLE "goals" ADD "resetPeriod" "public"."goals_resetperiod_enum" NOT NULL DEFAULT 'monthly'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "goals" DROP COLUMN "resetPeriod"`);
    await queryRunner.query(`DROP TYPE "public"."goals_resetperiod_enum"`);
  }
}
