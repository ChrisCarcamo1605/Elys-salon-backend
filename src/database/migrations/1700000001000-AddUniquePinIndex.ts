import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniquePinIndex1700000001000 implements MigrationInterface {
  name = 'AddUniquePinIndex1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE UNIQUE INDEX uniq_pin ON users(pin_hash) WHERE status != 'inactiva'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uniq_pin`);
  }
}