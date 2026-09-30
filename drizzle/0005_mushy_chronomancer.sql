CREATE TYPE "public"."clock_event_type" AS ENUM('CLOCK_IN', 'CLOCK_OUT', 'BREAK_START', 'BREAK_END');--> statement-breakpoint
CREATE TYPE "public"."item_category" AS ENUM('FINISHED_PRODUCT', 'RAW_MATERIAL', 'RESALE', 'SUPPLY');--> statement-breakpoint
CREATE TYPE "public"."waste_reason" AS ENUM('BURNT_OR_OVERCOOKED', 'EXPIRED', 'DAMAGED', 'SPOILED', 'AUDIT_DISCREPANCY');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"role" "role" DEFAULT 'CASHIER' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"ingredient_product_id" uuid NOT NULL,
	"quantity_required" numeric(10, 3) NOT NULL,
	"unit" text DEFAULT 'KG' NOT NULL,
	"waste_percentage" numeric(5, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"name" text NOT NULL,
	"yield_units" numeric(10, 3) DEFAULT '1' NOT NULL,
	"estimated_minutes" integer DEFAULT 45,
	"instructions" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemetry_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"device_id" text NOT NULL,
	"event_type" text NOT NULL,
	"confidence" numeric(5, 4),
	"payload" jsonb NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_clock_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"event_type" "clock_event_type" NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"device_info" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waste_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" numeric(10, 3) NOT NULL,
	"cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"reason" "waste_reason" NOT NULL,
	"reported_by_user_id" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bake_queue" ADD COLUMN "recipe_id" uuid;--> statement-breakpoint
ALTER TABLE "bake_queue" ADD COLUMN "priority" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "bake_queue" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "bake_queue" ADD COLUMN "deducted_ingredients" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "pin_hash" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "category" "item_category" DEFAULT 'FINISHED_PRODUCT' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "cost" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "employee_id" uuid;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pin_hash" text;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredient_product_id_products_id_fk" FOREIGN KEY ("ingredient_product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_events" ADD CONSTRAINT "telemetry_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_events" ADD CONSTRAINT "telemetry_events_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_clock_logs" ADD CONSTRAINT "time_clock_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_clock_logs" ADD CONSTRAINT "time_clock_logs_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_clock_logs" ADD CONSTRAINT "time_clock_logs_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_logs" ADD CONSTRAINT "waste_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_logs" ADD CONSTRAINT "waste_logs_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_logs" ADD CONSTRAINT "waste_logs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_logs" ADD CONSTRAINT "waste_logs_reported_by_user_id_users_id_fk" FOREIGN KEY ("reported_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_keys_tenant_branch_idx" ON "api_keys" USING btree ("tenant_id","branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "recipe_ingredients_tenant_recipe_idx" ON "recipe_ingredients" USING btree ("tenant_id","recipe_id");--> statement-breakpoint
CREATE INDEX "recipe_ingredients_ingredient_idx" ON "recipe_ingredients" USING btree ("tenant_id","ingredient_product_id");--> statement-breakpoint
CREATE INDEX "recipes_tenant_product_idx" ON "recipes" USING btree ("tenant_id","product_id");--> statement-breakpoint
CREATE INDEX "recipes_tenant_idx" ON "recipes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "telemetry_tenant_branch_idx" ON "telemetry_events" USING btree ("tenant_id","branch_id");--> statement-breakpoint
CREATE INDEX "telemetry_device_timestamp_idx" ON "telemetry_events" USING btree ("device_id","timestamp");--> statement-breakpoint
CREATE INDEX "time_clock_tenant_branch_idx" ON "time_clock_logs" USING btree ("tenant_id","branch_id");--> statement-breakpoint
CREATE INDEX "time_clock_employee_time_idx" ON "time_clock_logs" USING btree ("tenant_id","employee_id","timestamp");--> statement-breakpoint
CREATE INDEX "waste_logs_tenant_branch_idx" ON "waste_logs" USING btree ("tenant_id","branch_id");--> statement-breakpoint
CREATE INDEX "waste_logs_product_idx" ON "waste_logs" USING btree ("tenant_id","product_id");--> statement-breakpoint
ALTER TABLE "bake_queue" ADD CONSTRAINT "bake_queue_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alerts_tenant_target_branch_idx" ON "alerts" USING btree ("tenant_id","target_branch_id");--> statement-breakpoint
CREATE INDEX "alerts_tenant_read_idx" ON "alerts" USING btree ("tenant_id","is_read");--> statement-breakpoint
CREATE INDEX "bake_queue_tenant_branch_idx" ON "bake_queue" USING btree ("tenant_id","branch_id");--> statement-breakpoint
CREATE INDEX "bake_queue_status_idx" ON "bake_queue" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "branches_tenant_idx" ON "branches" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "cash_movements_tenant_branch_idx" ON "cash_movements" USING btree ("tenant_id","branch_id");--> statement-breakpoint
CREATE INDEX "cash_movements_session_idx" ON "cash_movements" USING btree ("tenant_id","cash_session_id");--> statement-breakpoint
CREATE INDEX "cash_sessions_tenant_branch_idx" ON "cash_sessions" USING btree ("tenant_id","branch_id");--> statement-breakpoint
CREATE INDEX "cash_sessions_opened_idx" ON "cash_sessions" USING btree ("tenant_id","opened_at");--> statement-breakpoint
CREATE INDEX "employees_tenant_branch_idx" ON "employees" USING btree ("tenant_id","branch_id");--> statement-breakpoint
CREATE INDEX "products_tenant_branch_idx" ON "products" USING btree ("tenant_id","branch_id");--> statement-breakpoint
CREATE INDEX "products_barcode_idx" ON "products" USING btree ("tenant_id","barcode");--> statement-breakpoint
CREATE INDEX "sale_items_sale_idx" ON "sale_items" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "sale_items_product_idx" ON "sale_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "sales_tenant_branch_idx" ON "sales" USING btree ("tenant_id","branch_id");--> statement-breakpoint
CREATE INDEX "sales_created_at_idx" ON "sales" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_tenant_idempotency_idx" ON "sales" USING btree ("tenant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "shifts_tenant_branch_idx" ON "shifts" USING btree ("tenant_id","branch_id");--> statement-breakpoint
CREATE INDEX "shifts_employee_idx" ON "shifts" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE INDEX "sub_payments_tenant_idx" ON "subscription_payments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "users_tenant_branch_idx" ON "users" USING btree ("tenant_id","branch_id");