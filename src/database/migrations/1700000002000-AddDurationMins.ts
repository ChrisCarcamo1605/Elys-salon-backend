import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDurationMins1700000002000 implements MigrationInterface {
  name = 'AddDurationMins1700000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "time_entries" ADD COLUMN "duration_mins" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "time_entries" DROP COLUMN "duration_mins"`,
    );
  }
}
