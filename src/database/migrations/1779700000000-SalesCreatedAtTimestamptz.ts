import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `sales.created_at` se creó como `timestamp without time zone`. La sesión de
 * Postgres corre en UTC, así que `now()` guardaba el reloj-de-pared UTC como un
 * valor "naive"; pero el proceso Node corre con TZ=America/El_Salvador (UTC-6),
 * por lo que al leer/comparar ese naive quedaba desfasado 6h. Efecto: una venta
 * recién creada quedaba ~6h por delante del límite superior (`to = ahora`) de
 * todo rango de Analytics y no aparecía, aunque la creación devolviera 201.
 *
 * Pasar la columna a `timestamptz` la vuelve independiente de la zona horaria:
 * se guarda y compara como instante. Los valores existentes se interpretan como
 * UTC (que es como se escribieron con la sesión en UTC).
 */
export class SalesCreatedAtTimestamptz1779700000000
  implements MigrationInterface
{
  name = 'SalesCreatedAtTimestamptz1779700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sales"
        ALTER COLUMN "created_at" TYPE timestamptz
        USING "created_at" AT TIME ZONE 'UTC'
    `);
    await queryRunner.query(`
      ALTER TABLE "sales" ALTER COLUMN "created_at" SET DEFAULT now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sales"
        ALTER COLUMN "created_at" TYPE timestamp
        USING "created_at" AT TIME ZONE 'UTC'
    `);
    await queryRunner.query(`
      ALTER TABLE "sales" ALTER COLUMN "created_at" SET DEFAULT now()
    `);
  }
}
