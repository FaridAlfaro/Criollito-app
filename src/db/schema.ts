import { 
  pgTable, 
  text, 
  timestamp, 
  uuid, 
  decimal, 
  pgEnum, 
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==========================================
// 1. ENUMS
// ==========================================

export const roleEnum = pgEnum("role", ["SUPER_ADMIN", "ADMIN", "SUPERVISOR", "BAKER", "CASHIER"]);
export const productTypeEnum = pgEnum("product_type", ["UNIT", "WEIGHT"]);
export const paymentMethodEnum = pgEnum("payment_method", ["CASH", "DEBIT", "CREDIT", "QR"]);
export const bakeStatusEnum = pgEnum("bake_status", ["PENDING", "BAKING", "COMPLETED"]);
export const alertTypeEnum = pgEnum("alert_type", ["LOW_STOCK", "SYSTEM"]);
export const docTypeEnum = pgEnum("doc_type", ["DNI", "CUIT", "CUIL", "PASAPORTE", "CONSUMIDOR_FINAL"]);
export const comprobanteTypeEnum = pgEnum("comprobante_type", ["FACTURA_A", "FACTURA_B", "FACTURA_C", "NOTA_CREDITO"]);
export const movementTypeEnum = pgEnum("movement_type", ["INGRESO", "EGRESO_PROVEEDOR", "EGRESO_SUELDO", "EGRESO_VARIOS"]);
export const shiftTypeEnum = pgEnum("shift_type", ["morning", "afternoon", "night"]);
export const dayOfWeekEnum = pgEnum("day_of_week", ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]);

// Nuevos enums modulares (Identity, Inventory, Kitchen)
export const clockEventTypeEnum = pgEnum("clock_event_type", ["CLOCK_IN", "CLOCK_OUT", "BREAK_START", "BREAK_END"]);
export const itemCategoryEnum = pgEnum("item_category", ["FINISHED_PRODUCT", "RAW_MATERIAL", "RESALE", "SUPPLY"]);
export const wasteReasonEnum = pgEnum("waste_reason", ["BURNT_OR_OVERCOOKED", "EXPIRED", "DAMAGED", "SPOILED", "AUDIT_DISCREPANCY"]);

// ==========================================
// 2. TABLAS PRINCIPALES (Multi-tenant)
// ==========================================

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  businessName: text("business_name"),
  cuit: text("cuit"),
  puntoVenta: integer("punto_venta").default(1),
  plan: integer("plan").default(14).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 3. SUCURSALES (Branches) - Multi-branch por Tenant
// ==========================================

export const branches = pgTable("branches", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  address: text("address"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("branches_tenant_idx").on(table.tenantId),
]);

// ==========================================
// 4. SUBDOMINIO: IDENTITY & PERSONAL
// ==========================================

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  pinHash: text("pin_hash"), // Autenticación rápida táctil en POS
  role: roleEnum("role").notNull().default("CASHIER"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("users_tenant_branch_idx").on(table.tenantId, table.branchId),
]);

// Tabla de empleados (datos de RRHH separados de la tabla de autenticación users)
export const employees = pgTable("employees", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  pinHash: text("pin_hash"), // PIN de fichado y desbloqueo de terminal
  role: roleEnum("role").notNull().default("CASHIER"),
  baseSalary: decimal("base_salary", { precision: 10, scale: 2 }).notNull().default("0"),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("employees_tenant_branch_idx").on(table.tenantId, table.branchId),
]);

// Tabla de turnos (planificación semanal de horarios por empleado)
export const shifts = pgTable("shifts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  day: dayOfWeekEnum("day").notNull(),
  shiftType: shiftTypeEnum("shift_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("shifts_tenant_branch_idx").on(table.tenantId, table.branchId),
  index("shifts_employee_idx").on(table.tenantId, table.employeeId),
]);

// Fichadas reales (reloj de asistencia con PIN)
export const timeClockLogs = pgTable("time_clock_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "cascade" }).notNull(),
  employeeId: uuid("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  eventType: clockEventTypeEnum("event_type").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  deviceInfo: text("device_info"), // Identificador de terminal o tablet
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("time_clock_tenant_branch_idx").on(table.tenantId, table.branchId),
  index("time_clock_employee_time_idx").on(table.tenantId, table.employeeId, table.timestamp),
]);

// API Keys para autenticación dual de terminales Edge / POS offline
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  role: roleEnum("role").default("CASHIER").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("api_keys_tenant_branch_idx").on(table.tenantId, table.branchId),
  uniqueIndex("api_keys_hash_idx").on(table.keyHash),
]);

// ==========================================
// 5. SUBDOMINIO: SALES (Sesiones de Caja y Movimientos)
// ==========================================

export const cashSessions = pgTable("cash_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
  cashierId: uuid("cashier_id").references(() => users.id).notNull(),
  openedAt: timestamp("opened_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
  initialAmount: decimal("initial_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  finalAmount: decimal("final_amount", { precision: 10, scale: 2 }),
  totalSales: decimal("total_sales", { precision: 10, scale: 2 }).default("0"),
  totalCash: decimal("total_cash", { precision: 10, scale: 2 }).default("0"),
  totalDebit: decimal("total_debit", { precision: 10, scale: 2 }).default("0"),
  totalCredit: decimal("total_credit", { precision: 10, scale: 2 }).default("0"),
  totalQr: decimal("total_qr", { precision: 10, scale: 2 }).default("0"),
  theoreticalAmount: decimal("theoretical_amount", { precision: 10, scale: 2 }).default("0"),
  difference: decimal("difference", { precision: 10, scale: 2 }),
}, (table) => [
  index("cash_sessions_tenant_branch_idx").on(table.tenantId, table.branchId),
  index("cash_sessions_opened_idx").on(table.tenantId, table.openedAt),
]);

export const cashMovements = pgTable("cash_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
  cashSessionId: uuid("cash_session_id").references(() => cashSessions.id, { onDelete: "cascade" }).notNull(),
  cashierId: uuid("cashier_id").references(() => users.id).notNull(),
  type: movementTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("cash_movements_tenant_branch_idx").on(table.tenantId, table.branchId),
  index("cash_movements_session_idx").on(table.tenantId, table.cashSessionId),
]);

// ==========================================
// 6. SUBDOMINIO: INVENTORY (Catálogo, Stock y Mermas)
// ==========================================

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  type: productTypeEnum("type").notNull(), 
  category: itemCategoryEnum("category").default("FINISHED_PRODUCT").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).default("0").notNull(),
  currentStock: decimal("current_stock", { precision: 10, scale: 3 }).notNull().default("0"),
  minDailyStock: decimal("min_daily_stock", { precision: 10, scale: 3 }).notNull().default("0"),
  optimalBatchSize: decimal("optimal_batch_size", { precision: 10, scale: 3 }).notNull().default("1"),
  barcode: text("barcode"), // EAN-13
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("products_tenant_branch_idx").on(table.tenantId, table.branchId),
  index("products_barcode_idx").on(table.tenantId, table.barcode),
]);

export const wasteLogs = pgTable("waste_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "restrict" }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).default("0").notNull(),
  reason: wasteReasonEnum("reason").notNull(),
  reportedByUserId: uuid("reported_by_user_id").references(() => users.id).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("waste_logs_tenant_branch_idx").on(table.tenantId, table.branchId),
  index("waste_logs_product_idx").on(table.tenantId, table.productId),
]);

// ==========================================
// 7. SUBDOMINIO: SALES (Órdenes, Ítems y Facturación ARCA)
// ==========================================

export const sales = pgTable("sales", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
  cashSessionId: uuid("cash_session_id").references(() => cashSessions.id),
  cashierId: uuid("cashier_id").references(() => users.id).notNull(),
  employeeId: uuid("employee_id").references(() => employees.id, { onDelete: "set null" }),
  idempotencyKey: text("idempotency_key"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  
  // ARCA Compliance
  clienteTipoDocumento: docTypeEnum("cliente_tipo_documento").default("CONSUMIDOR_FINAL"),
  clienteDocumento: text("cliente_documento"),
  comprobanteTipo: comprobanteTypeEnum("comprobante_tipo"),
  puntoVenta: integer("punto_venta"),
  numeroComprobante: integer("numero_comprobante"),
  ivaContenido: decimal("iva_contenido", { precision: 10, scale: 2 }),
  cae: text("cae"),
  caeExpiration: timestamp("cae_expiration"),
  qrCodeData: text("qr_code_data"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("sales_tenant_branch_idx").on(table.tenantId, table.branchId),
  index("sales_created_at_idx").on(table.tenantId, table.createdAt),
  uniqueIndex("sales_tenant_idempotency_idx").on(table.tenantId, table.idempotencyKey),
]);

export const saleItems = pgTable("sale_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  saleId: uuid("sale_id").references(() => sales.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
}, (table) => [
  index("sale_items_sale_idx").on(table.saleId),
  index("sale_items_product_idx").on(table.productId),
]);

// ==========================================
// 8. SUBDOMINIO: KITCHEN (Recetas, Escandallos y Cola de Horneado)
// ==========================================

export const recipes = pgTable("recipes", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  yieldUnits: decimal("yield_units", { precision: 10, scale: 3 }).notNull().default("1"),
  unitsPerTray: integer("units_per_tray").default(24).notNull(),
  estimatedMinutes: integer("estimated_minutes").default(45),
  instructions: text("instructions"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("recipes_tenant_product_idx").on(table.tenantId, table.productId),
  index("recipes_tenant_idx").on(table.tenantId),
]);

export const recipeIngredients = pgTable("recipe_ingredients", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  recipeId: uuid("recipe_id").references(() => recipes.id, { onDelete: "cascade" }).notNull(),
  ingredientProductId: uuid("ingredient_product_id").references(() => products.id, { onDelete: "restrict" }).notNull(),
  quantityRequired: decimal("quantity_required", { precision: 10, scale: 3 }).notNull(),
  unit: text("unit").notNull().default("KG"),
  wastePercentage: decimal("waste_percentage", { precision: 5, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("recipe_ingredients_tenant_recipe_idx").on(table.tenantId, table.recipeId),
  index("recipe_ingredients_ingredient_idx").on(table.tenantId, table.ingredientProductId),
]);

export const bakeQueue = pgTable("bake_queue", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
  productId: uuid("product_id").references(() => products.id).notNull(),
  recipeId: uuid("recipe_id").references(() => recipes.id, { onDelete: "set null" }),
  quantityNeeded: decimal("quantity_needed", { precision: 10, scale: 3 }).notNull(),
  status: bakeStatusEnum("status").notNull().default("PENDING"),
  priority: integer("priority").default(1).notNull(),
  notes: text("notes"),
  deductedIngredients: boolean("deducted_ingredients").default(false).notNull(),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("bake_queue_tenant_branch_idx").on(table.tenantId, table.branchId),
  index("bake_queue_status_idx").on(table.tenantId, table.status),
]);

// ==========================================
// 9. SUBDOMINIO: TELEMETRY & ALERTAS (Edge CV / IoT)
// ==========================================

export const alerts = pgTable("alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  targetBranchId: uuid("target_branch_id").references(() => branches.id, { onDelete: "cascade" }),
  type: alertTypeEnum("type").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("alerts_tenant_target_branch_idx").on(table.tenantId, table.targetBranchId),
  index("alerts_tenant_read_idx").on(table.tenantId, table.isRead),
]);

export const telemetryEvents = pgTable("telemetry_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "cascade" }).notNull(),
  deviceId: text("device_id").notNull(),
  eventType: text("event_type").notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 4 }),
  payload: jsonb("payload").notNull(),
  processed: boolean("processed").default(false).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("telemetry_tenant_branch_idx").on(table.tenantId, table.branchId),
  index("telemetry_device_timestamp_idx").on(table.deviceId, table.timestamp),
]);

// ==========================================
// 10. SUSCRIPCIONES
// ==========================================

export const subscriptionPayments = pgTable("subscription_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  period: text("period").notNull(),
  status: text("status").notNull().default("PENDING"),
  dueDate: timestamp("due_date").notNull(),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("sub_payments_tenant_idx").on(table.tenantId),
]);

// ==========================================
// 11. RELACIONES
// ==========================================

export const tenantsRelations = relations(tenants, ({ many }) => ({
  branches: many(branches),
  users: many(users),
  employees: many(employees),
  shifts: many(shifts),
  timeClockLogs: many(timeClockLogs),
  apiKeys: many(apiKeys),
  products: many(products),
  wasteLogs: many(wasteLogs),
  recipes: many(recipes),
  recipeIngredients: many(recipeIngredients),
  sales: many(sales),
  bakeQueue: many(bakeQueue),
  alerts: many(alerts),
  telemetryEvents: many(telemetryEvents),
  cashSessions: many(cashSessions),
  cashMovements: many(cashMovements),
  subscriptionPayments: many(subscriptionPayments),
}));

export const branchesRelations = relations(branches, ({ one, many }) => ({
  tenant: one(tenants, { fields: [branches.tenantId], references: [tenants.id] }),
  users: many(users),
  employees: many(employees),
  shifts: many(shifts),
  timeClockLogs: many(timeClockLogs),
  apiKeys: many(apiKeys),
  products: many(products),
  wasteLogs: many(wasteLogs),
  sales: many(sales),
  bakeQueue: many(bakeQueue),
  cashSessions: many(cashSessions),
  cashMovements: many(cashMovements),
  alerts: many(alerts),
  telemetryEvents: many(telemetryEvents),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  branch: one(branches, { fields: [users.branchId], references: [branches.id] }),
  employee: one(employees, { fields: [users.id], references: [employees.userId] }),
  sales: many(sales),
  cashSessions: many(cashSessions),
  cashMovements: many(cashMovements),
  reportedWastes: many(wasteLogs),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  tenant: one(tenants, { fields: [employees.tenantId], references: [tenants.id] }),
  branch: one(branches, { fields: [employees.branchId], references: [branches.id] }),
  user: one(users, { fields: [employees.userId], references: [users.id] }),
  shifts: many(shifts),
  timeClockLogs: many(timeClockLogs),
  sales: many(sales),
}));

export const shiftsRelations = relations(shifts, ({ one }) => ({
  tenant: one(tenants, { fields: [shifts.tenantId], references: [tenants.id] }),
  branch: one(branches, { fields: [shifts.branchId], references: [branches.id] }),
  employee: one(employees, { fields: [shifts.employeeId], references: [employees.id] }),
}));

export const timeClockLogsRelations = relations(timeClockLogs, ({ one }) => ({
  tenant: one(tenants, { fields: [timeClockLogs.tenantId], references: [tenants.id] }),
  branch: one(branches, { fields: [timeClockLogs.branchId], references: [branches.id] }),
  employee: one(employees, { fields: [timeClockLogs.employeeId], references: [employees.id] }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  tenant: one(tenants, { fields: [apiKeys.tenantId], references: [tenants.id] }),
  branch: one(branches, { fields: [apiKeys.branchId], references: [branches.id] }),
}));

export const cashSessionsRelations = relations(cashSessions, ({ one, many }) => ({
  tenant: one(tenants, { fields: [cashSessions.tenantId], references: [tenants.id] }),
  branch: one(branches, { fields: [cashSessions.branchId], references: [branches.id] }),
  cashier: one(users, { fields: [cashSessions.cashierId], references: [users.id] }),
  sales: many(sales),
  movements: many(cashMovements),
}));

export const cashMovementsRelations = relations(cashMovements, ({ one }) => ({
  tenant: one(tenants, { fields: [cashMovements.tenantId], references: [tenants.id] }),
  branch: one(branches, { fields: [cashMovements.branchId], references: [branches.id] }),
  session: one(cashSessions, { fields: [cashMovements.cashSessionId], references: [cashSessions.id] }),
  cashier: one(users, { fields: [cashMovements.cashierId], references: [users.id] }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  tenant: one(tenants, { fields: [products.tenantId], references: [tenants.id] }),
  branch: one(branches, { fields: [products.branchId], references: [branches.id] }),
  saleItems: many(saleItems),
  bakeQueue: many(bakeQueue),
  recipes: many(recipes),
  asIngredientIn: many(recipeIngredients),
  wasteLogs: many(wasteLogs),
}));

export const wasteLogsRelations = relations(wasteLogs, ({ one }) => ({
  tenant: one(tenants, { fields: [wasteLogs.tenantId], references: [tenants.id] }),
  branch: one(branches, { fields: [wasteLogs.branchId], references: [branches.id] }),
  product: one(products, { fields: [wasteLogs.productId], references: [products.id] }),
  reportedByUser: one(users, { fields: [wasteLogs.reportedByUserId], references: [users.id] }),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  tenant: one(tenants, { fields: [sales.tenantId], references: [tenants.id] }),
  branch: one(branches, { fields: [sales.branchId], references: [branches.id] }),
  cashier: one(users, { fields: [sales.cashierId], references: [users.id] }),
  employee: one(employees, { fields: [sales.employeeId], references: [employees.id] }),
  session: one(cashSessions, { fields: [sales.cashSessionId], references: [cashSessions.id] }),
  items: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, { fields: [saleItems.saleId], references: [sales.id] }),
  product: one(products, { fields: [saleItems.productId], references: [products.id] }),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  tenant: one(tenants, { fields: [recipes.tenantId], references: [tenants.id] }),
  product: one(products, { fields: [recipes.productId], references: [products.id] }),
  ingredients: many(recipeIngredients),
  bakeTasks: many(bakeQueue),
}));

export const recipeIngredientsRelations = relations(recipeIngredients, ({ one }) => ({
  tenant: one(tenants, { fields: [recipeIngredients.tenantId], references: [tenants.id] }),
  recipe: one(recipes, { fields: [recipeIngredients.recipeId], references: [recipes.id] }),
  ingredientProduct: one(products, { fields: [recipeIngredients.ingredientProductId], references: [products.id] }),
}));

export const bakeQueueRelations = relations(bakeQueue, ({ one }) => ({
  tenant: one(tenants, { fields: [bakeQueue.tenantId], references: [tenants.id] }),
  branch: one(branches, { fields: [bakeQueue.branchId], references: [branches.id] }),
  product: one(products, { fields: [bakeQueue.productId], references: [products.id] }),
  recipe: one(recipes, { fields: [bakeQueue.recipeId], references: [recipes.id] }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  tenant: one(tenants, { fields: [alerts.tenantId], references: [tenants.id] }),
  targetBranch: one(branches, { fields: [alerts.targetBranchId], references: [branches.id] }),
}));

export const telemetryEventsRelations = relations(telemetryEvents, ({ one }) => ({
  tenant: one(tenants, { fields: [telemetryEvents.tenantId], references: [tenants.id] }),
  branch: one(branches, { fields: [telemetryEvents.branchId], references: [branches.id] }),
}));

export const subscriptionPaymentsRelations = relations(subscriptionPayments, ({ one }) => ({
  tenant: one(tenants, { fields: [subscriptionPayments.tenantId], references: [tenants.id] }),
}));
