-- Enable UUID generation for defaultRandom() columns
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text,
  "first_name" text,
  "last_name" text,
  "profile_image_url" text,
  "role" text NOT NULL DEFAULT 'viewer',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "warehouses" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "location" text,
  "description" text,
  "capacity" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "inventory_items" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "warehouse_id" uuid NOT NULL,
  "name" text NOT NULL,
  "sku" text NOT NULL,
  "category" text,
  "quantity" integer NOT NULL DEFAULT 0,
  "unit" text NOT NULL DEFAULT 'pcs',
  "batch_number" text,
  "expiration_date" timestamp,
  "location" text,
  "description" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "product_history" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "inventory_item_id" uuid NOT NULL,
  "action_type" text NOT NULL,
  "quantity_change" integer NOT NULL,
  "previous_quantity" integer NOT NULL,
  "new_quantity" integer NOT NULL,
  "user_id" text,
  "notes" text,
  "timestamp" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "tables" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "description" text,
  "created_by" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "table_rows" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "table_id" uuid NOT NULL,
  "data" jsonb NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "captured_images" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "url" text NOT NULL,
  "filename" text NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}',
  "ocr_text" text,
  "processed_data" jsonb NOT NULL DEFAULT '{}',
  "processing_status" text NOT NULL DEFAULT 'pending',
  "uploaded_by" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "user_id" text,
  "action" text NOT NULL,
  "endpoint" text NOT NULL,
  "method" text NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}',
  "ip_address" text,
  "timestamp" timestamp NOT NULL DEFAULT now()
);

-- Foreign keys
ALTER TABLE "inventory_items"
  ADD CONSTRAINT "inventory_items_warehouse_id_fkey"
  FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE;

ALTER TABLE "product_history"
  ADD CONSTRAINT "product_history_inventory_item_id_fkey"
  FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE;

ALTER TABLE "table_rows"
  ADD CONSTRAINT "table_rows_table_id_fkey"
  FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE CASCADE;
