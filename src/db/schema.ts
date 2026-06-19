import { 
  pgTable, 
  text, 
  timestamp, 
  uuid, 
  decimal, 
  pgEnum, 
  boolean,
  integer
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
});

// ==========================================
// 4. USUARIOS Y EMPLEADOS
// ==========================================

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("CASHIER"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tabla de empleados (datos de RRHH separados de la tabla de autenticación users)
export const employees = pgTable("employees", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: roleEnum("role").notNull().default("CASHIER"),
  baseSalary: decimal("base_salary", { precision: 10, scale: 2 }).notNull().default("0"),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tabla de turnos (horarios por empleado)
export const shifts = pgTable("shifts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  day: dayOfWeekEnum("day").notNull(),
  shiftType: shiftTypeEnum("shift_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 5. SESIONES DE CAJA Y MOVIMIENTOS
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
});

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
});

// ==========================================
// 6. PRODUCTOS
// ==========================================

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  type: productTypeEnum("type").notNull(), 
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currentStock: decimal("current_stock", { precision: 10, scale: 3 }).notNull().default("0"),
  minDailyStock: decimal("min_daily_stock", { precision: 10, scale: 3 }).notNull().default("0"),
  optimalBatchSize: decimal("optimal_batch_size", { precision: 10, scale: 3 }).notNull().default("1"),
  barcode: text("barcode"), // EAN-13
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 7. VENTAS
// ==========================================

export const sales = pgTable("sales", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
  cashSessionId: uuid("cash_session_id").references(() => cashSessions.id),
  cashierId: uuid("cashier_id").references(() => users.id).notNull(),
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
});

export const saleItems = pgTable("sale_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  saleId: uuid("sale_id").references(() => sales.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
});

// ==========================================
// 8. COLA DE HORNEADO
// ==========================================

export const bakeQueue = pgTable("bake_queue", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
  productId: uuid("product_id").references(() => products.id).notNull(),
  quantityNeeded: decimal("quantity_needed", { precision: 10, scale: 3 }).notNull(),
  status: bakeStatusEnum("status").notNull().default("PENDING"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

// ==========================================
// 9. ALERTAS - Con lógica Multi-sucursal
// ==========================================
// Regla de negocio:
//   targetBranchId = NULL  → alerta global para TODAS las sucursales del tenant
//   targetBranchId = <id>  → alerta exclusiva para esa sucursal específica

export const alerts = pgTable("alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  targetBranchId: uuid("target_branch_id").references(() => branches.id, { onDelete: "cascade" }),
  type: alertTypeEnum("type").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
});

// ==========================================
// 11. RELACIONES
// ==========================================

export const tenantsRelations = relations(tenants, ({ many }) => ({
  branches: many(branches),
  users: many(users),
  employees: many(employees),
  shifts: many(shifts),
  products: many(products),
  sales: many(sales),
  bakeQueue: many(bakeQueue),
  alerts: many(alerts),
  cashSessions: many(cashSessions),
  cashMovements: many(cashMovements),
  subscriptionPayments: many(subscriptionPayments),
}));

export const branchesRelations = relations(branches, ({ one, many }) => ({
  tenant: one(tenants, { fields: [branches.tenantId], references: [tenants.id] }),
  users: many(users),
  employees: many(employees),
  shifts: many(shifts),
  products: many(products),
  sales: many(sales),
  bakeQueue: many(bakeQueue),
  cashSessions: many(cashSessions),
  cashMovements: many(cashMovements),
  alerts: many(alerts),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  branch: one(branches, { fields: [users.branchId], references: [branches.id] }),
  employee: one(employees, { fields: [users.id], references: [employees.userId] }),
  sales: many(sales),
  cashSessions: many(cashSessions),
  cashMovements: many(cashMovements),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  tenant: one(tenants, { fields: [employees.tenantId], references: [tenants.id] }),
  branch: one(branches, { fields: [employees.branchId], references: [branches.id] }),
  user: one(users, { fields: [employees.userId], references: [users.id] }),
  shifts: many(shifts),
}));

export const shiftsRelations = relations(shifts, ({ one }) => ({
  tenant: one(tenants, { fields: [shifts.tenantId], references: [tenants.id] }),
  branch: one(branches, { fields: [shifts.branchId], references: [branches.id] }),
  employee: one(employees, { fields: [shifts.employeeId], references: [employees.id] }),
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
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  tenant: one(tenants, { fields: [sales.tenantId], references: [tenants.id] }),
  branch: one(branches, { fields: [sales.branchId], references: [branches.id] }),
  cashier: one(users, { fields: [sales.cashierId], references: [users.id] }),
  session: one(cashSessions, { fields: [sales.cashSessionId], references: [cashSessions.id] }),
  items: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, { fields: [saleItems.saleId], references: [sales.id] }),
  product: one(products, { fields: [saleItems.productId], references: [products.id] }),
}));

export const bakeQueueRelations = relations(bakeQueue, ({ one }) => ({
  tenant: one(tenants, { fields: [bakeQueue.tenantId], references: [tenants.id] }),
  branch: one(branches, { fields: [bakeQueue.branchId], references: [branches.id] }),
  product: one(products, { fields: [bakeQueue.productId], references: [products.id] }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  tenant: one(tenants, { fields: [alerts.tenantId], references: [tenants.id] }),
  targetBranch: one(branches, { fields: [alerts.targetBranchId], references: [branches.id] }),
}));

export const subscriptionPaymentsRelations = relations(subscriptionPayments, ({ one }) => ({
  tenant: one(tenants, { fields: [subscriptionPayments.tenantId], references: [tenants.id] }),
}));
