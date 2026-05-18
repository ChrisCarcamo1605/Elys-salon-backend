import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1700000000000 implements MigrationInterface {
  name = 'InitSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`CREATE TYPE public.role_enum AS ENUM ('admin','empleada')`);
    await queryRunner.query(`CREATE TYPE public.user_status_enum AS ENUM ('activa','vacaciones','inactiva')`);
    await queryRunner.query(`CREATE TYPE public.pay_type_enum AS ENUM ('salario','salario + comisión','comisión')`);
    await queryRunner.query(`CREATE TYPE public.item_type_enum AS ENUM ('S','P')`);
    await queryRunner.query(`CREATE TYPE public.sale_status_enum AS ENUM ('completed','voided')`);
    await queryRunner.query(`CREATE TYPE public.discount_kind_enum AS ENUM ('amount','percent')`);
    await queryRunner.query(`CREATE TYPE public.payment_method_enum AS ENUM ('cash','card','transfer')`);
    await queryRunner.query(`CREATE TYPE public.inventory_kind_enum AS ENUM ('purchase','adjustment')`);
    await queryRunner.query(`CREATE TYPE public.adjustment_reason_enum AS ENUM ('conteo','merma','robo','uso','devolucion')`);
    await queryRunner.query(`CREATE TYPE public.time_entry_source_enum AS ENUM ('ui','manual')`);
    await queryRunner.query(`CREATE TYPE public.bonus_metric_enum AS ENUM ('totalSales','retailSales','servicesDone','newClients','tipsCollected')`);
    await queryRunner.query(`CREATE TYPE public.reward_type_enum AS ENUM ('fixed','percent')`);
    await queryRunner.query(`CREATE TYPE public.goal_tone_enum AS ENUM ('magenta','purple','teal','green')`);
    await queryRunner.query(`CREATE TYPE public.alert_type_enum AS ENUM ('low_stock','discount_review','slow_mover','promo')`);
    await queryRunner.query(`CREATE TYPE public.alert_status_enum AS ENUM ('active','resolved','snoozed')`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(120) NOT NULL,
        "role" role_enum NOT NULL,
        "pin_hash" character varying(255) NOT NULL,
        "initials" character varying(4),
        "color" character varying(7),
        "position" character varying(80),
        "status" user_status_enum NOT NULL DEFAULT 'activa',
        "hire_date" date,
        "phone" character varying(20),
        "email" character varying,
        "birthday" date,
        "schedule" jsonb,
        "pay_type" pay_type_enum NOT NULL DEFAULT 'salario',
        "salary" numeric(10,2) NOT NULL DEFAULT 0,
        "commission_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "avatar_hue" integer,
        "permissions" jsonb NOT NULL DEFAULT '{}',
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_users_pin_unique" ON "users" ("pin_hash")`);

    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "token_hash" character varying(255) NOT NULL,
        "expires_at" timestamp with time zone NOT NULL,
        "revoked_at" timestamp with time zone,
        "ip" character varying(45),
        "user_agent" character varying(500),
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_sessions_user_expires" ON "sessions" ("user_id", "expires_at")`);

    await queryRunner.query(`
      CREATE TABLE "permissions_matrix" (
        "perm" character varying(120) NOT NULL,
        "admin" boolean NOT NULL DEFAULT false,
        "empleada" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_permissions_matrix" PRIMARY KEY ("perm")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "label" character varying(100) NOT NULL,
        "ordering" integer NOT NULL,
        CONSTRAINT "PK_categories" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "catalog_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "category_id" uuid,
        "type" item_type_enum NOT NULL,
        "name" character varying(200) NOT NULL,
        "price" numeric(10,2) NOT NULL,
        "cost" numeric(10,2) NOT NULL DEFAULT 0,
        "image" text,
        "duration" character varying(20),
        "stock" integer,
        "stock_min" integer,
        "alert_enabled" boolean NOT NULL DEFAULT true,
        "brand" character varying(100),
        "sku" character varying(60),
        "active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_catalog_items" PRIMARY KEY ("id"),
        CONSTRAINT "fk_catalog_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_catalog_category_active" ON "catalog_items" ("category_id", "active")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "uniq_sku" ON "catalog_items" ("sku") WHERE "sku" IS NOT NULL`);

    await queryRunner.query(`
      CREATE TABLE "sales" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "number" SERIAL,
        "employee_id" uuid NOT NULL,
        "customer_name" character varying(120),
        "customer_phone" character varying(20),
        "customer_is_new" boolean NOT NULL DEFAULT false,
        "subtotal" numeric(10,2) NOT NULL DEFAULT 0,
        "discount_total" numeric(10,2) NOT NULL DEFAULT 0,
        "total" numeric(10,2) NOT NULL DEFAULT 0,
        "tip" numeric(10,2) NOT NULL DEFAULT 0,
        "status" sale_status_enum NOT NULL DEFAULT 'completed',
        "voided_at" timestamp with time zone,
        "voided_by_id" uuid,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sales" PRIMARY KEY ("id"),
        CONSTRAINT "fk_sales_employee" FOREIGN KEY ("employee_id") REFERENCES "users"("id"),
        CONSTRAINT "fk_sales_voided_by" FOREIGN KEY ("voided_by_id") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_sales_employee_date_status" ON "sales" ("employee_id", "created_at", "status")`);

    await queryRunner.query(`
      CREATE TABLE "sale_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sale_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "item_type" character(1) NOT NULL,
        "item_name" character varying(200) NOT NULL,
        "base_price" numeric(10,2) NOT NULL,
        "price" numeric(10,2) NOT NULL,
        "qty" integer NOT NULL DEFAULT 1,
        "discount_kind" discount_kind_enum,
        "discount_value" numeric(10,2) NOT NULL DEFAULT 0,
        "discount_by_id" uuid,
        CONSTRAINT "PK_sale_lines" PRIMARY KEY ("id"),
        CONSTRAINT "fk_sale_lines_sale" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_sale_lines_item" FOREIGN KEY ("item_id") REFERENCES "catalog_items"("id"),
        CONSTRAINT "fk_sale_lines_discount_by" FOREIGN KEY ("discount_by_id") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_sale_lines_item" ON "sale_lines" ("item_id")`);

    await queryRunner.query(`
      CREATE TABLE "sale_payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sale_id" uuid NOT NULL,
        "method" payment_method_enum NOT NULL,
        "amount" numeric(10,2) NOT NULL,
        "card_last4" character varying(4),
        "card_brand" character varying(20),
        "auth_code" character varying(50),
        CONSTRAINT "PK_sale_payments" PRIMARY KEY ("id"),
        CONSTRAINT "fk_sale_payments_sale" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "inventory_entries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "product_id" uuid NOT NULL,
        "kind" inventory_kind_enum NOT NULL,
        "qty_delta" integer NOT NULL,
        "stock_after" integer NOT NULL,
        "unit_cost" numeric(10,2) NOT NULL DEFAULT 0,
        "total_cost" numeric(10,2) NOT NULL DEFAULT 0,
        "supplier" character varying(120),
        "invoice" character varying(60),
        "reason" adjustment_reason_enum,
        "notes" text,
        "created_by_id" uuid,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inventory_entries" PRIMARY KEY ("id"),
        CONSTRAINT "fk_inventory_product" FOREIGN KEY ("product_id") REFERENCES "catalog_items"("id"),
        CONSTRAINT "fk_inventory_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_inventory_product_date" ON "inventory_entries" ("product_id", "created_at")`);

    await queryRunner.query(`
      CREATE TABLE "time_entries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "date" date NOT NULL,
        "in_at" time NOT NULL,
        "out_at" time,
        "source" time_entry_source_enum NOT NULL DEFAULT 'ui',
        "edited_by_id" uuid,
        CONSTRAINT "PK_time_entries" PRIMARY KEY ("id"),
        CONSTRAINT "fk_time_entries_user" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
        CONSTRAINT "fk_time_entries_edited_by" FOREIGN KEY ("edited_by_id") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_time_user_date" ON "time_entries" ("user_id", "date")`);

    await queryRunner.query(`
      CREATE TABLE "goals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "icon" character varying(60) NOT NULL,
        "label" character varying(100) NOT NULL,
        "description" character varying(500),
        "metric" bonus_metric_enum NOT NULL,
        "unit" character varying(20) NOT NULL,
        "target" numeric(10,2) NOT NULL,
        "reward" character varying(120),
        "reward_type" reward_type_enum NOT NULL,
        "reward_value" numeric(10,2) NOT NULL DEFAULT 0,
        "tone" goal_tone_enum NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_goals" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "promotions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(120) NOT NULL,
        "description" character varying(500),
        "off" character varying(40) NOT NULL,
        "rule" jsonb,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_promotions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "alerts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" alert_type_enum NOT NULL,
        "resource_id" uuid,
        "status" alert_status_enum NOT NULL DEFAULT 'active',
        "snoozed_until" timestamp with time zone,
        "resolved_by_id" uuid,
        "resolved_at" timestamp with time zone,
        "suggested_offer_kind" discount_kind_enum,
        "suggested_offer_value" numeric(10,2),
        "offer_active" boolean NOT NULL DEFAULT false,
        "notes" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_alerts" PRIMARY KEY ("id"),
        CONSTRAINT "fk_alerts_resolved_by" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_alerts_type_status" ON "alerts" ("type", "status")`);

    await queryRunner.query(`
      CREATE TABLE "settings" (
        "key" character varying(60) NOT NULL,
        "value" jsonb NOT NULL,
        CONSTRAINT "PK_settings" PRIMARY KEY ("key")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_preferences" (
        "user_id" uuid NOT NULL,
        "value" jsonb NOT NULL,
        CONSTRAINT "PK_user_preferences" PRIMARY KEY ("user_id"),
        CONSTRAINT "fk_user_preferences_user" FOREIGN KEY ("user_id") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "audit_log" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid,
        "action" character varying(20) NOT NULL,
        "resource" character varying(60) NOT NULL,
        "resource_id" character varying(40),
        "payload" jsonb,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_log" PRIMARY KEY ("id"),
        CONSTRAINT "fk_audit_log_user" FOREIGN KEY ("user_id") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_audit_user_created" ON "audit_log" ("user_id", "created_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_log" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_preferences" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "settings" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "alerts" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "promotions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "goals" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "time_entries" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_entries" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sale_payments" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sale_lines" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sales" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "catalog_items" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permissions_matrix" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sessions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);

    await queryRunner.query(`DROP TYPE IF EXISTS public.alert_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS public.alert_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS public.goal_tone_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS public.reward_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS public.bonus_metric_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS public.time_entry_source_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS public.adjustment_reason_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS public.inventory_kind_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS public.payment_method_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS public.discount_kind_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS public.sale_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS public.item_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS public.pay_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS public.user_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS public.role_enum`);
  }
}