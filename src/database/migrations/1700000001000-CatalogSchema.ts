import { MigrationInterface, QueryRunner } from 'typeorm';

export class CatalogSchema1700000001000 implements MigrationInterface {
  name = 'CatalogSchema1700000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "product_categories" (
        "id"         UUID        NOT NULL DEFAULT gen_random_uuid(),
        "name"       VARCHAR(120) NOT NULL,
        "active"     BOOLEAN     NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_categories" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "service_categories" (
        "id"         UUID        NOT NULL DEFAULT gen_random_uuid(),
        "name"       VARCHAR(120) NOT NULL,
        "active"     BOOLEAN     NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_service_categories" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "products" (
        "id"                  UUID           NOT NULL DEFAULT gen_random_uuid(),
        "sku"                 VARCHAR(80)    NOT NULL,
        "name"                VARCHAR(200)   NOT NULL,
        "description"         TEXT,
        "category_id"         UUID,
        "sale_price"          NUMERIC(12,2)  NOT NULL,
        "cost_price"          NUMERIC(12,2)  NOT NULL DEFAULT 0,
        "stock"               INTEGER        NOT NULL DEFAULT 0,
        "low_stock_threshold" INTEGER        NOT NULL DEFAULT 5,
        "active"              BOOLEAN        NOT NULL DEFAULT true,
        "deleted_at"          TIMESTAMPTZ,
        "created_at"          TIMESTAMPTZ    NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMPTZ    NOT NULL DEFAULT now(),
        CONSTRAINT "PK_products"        PRIMARY KEY ("id"),
        CONSTRAINT "UQ_products_sku"    UNIQUE ("sku"),
        CONSTRAINT "FK_products_cat"    FOREIGN KEY ("category_id")
          REFERENCES "product_categories"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "services" (
        "id"           UUID           NOT NULL DEFAULT gen_random_uuid(),
        "name"         VARCHAR(200)   NOT NULL,
        "description"  TEXT,
        "category_id"  UUID,
        "base_price"   NUMERIC(12,2)  NOT NULL,
        "duration_min" INTEGER        NOT NULL DEFAULT 30,
        "active"       BOOLEAN        NOT NULL DEFAULT true,
        "deleted_at"   TIMESTAMPTZ,
        "created_at"   TIMESTAMPTZ    NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMPTZ    NOT NULL DEFAULT now(),
        CONSTRAINT "PK_services"     PRIMARY KEY ("id"),
        CONSTRAINT "FK_services_cat" FOREIGN KEY ("category_id")
          REFERENCES "service_categories"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_products_category"    ON "products" ("category_id");
      CREATE INDEX "IDX_products_active"      ON "products" ("active") WHERE deleted_at IS NULL;
      CREATE INDEX "IDX_services_category"    ON "services" ("category_id");
      CREATE INDEX "IDX_services_active"      ON "services" ("active") WHERE deleted_at IS NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "services"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "service_categories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_categories"`);
  }
}
