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

export const roleEnum = pgEnum("role", ["ADMIN", "SUPERVISOR", "BAKER", "CASHIER"]);
export const productTypeEnum = pgEnum("product_type", ["UNIT", "WEIGHT"]);
export const paymentMethodEnum = pgEnum("payment_method", ["CASH", "DEBIT", "CREDIT"]);
export const bakeStatusEnum = pgEnum("bake_status", ["PENDING", "BAKING", "COMPLETED"]);
export const alertTypeEnum = pgEnum("alert_type", ["LOW_STOCK", "SYSTEM"]);
export const docTypeEnum = pgEnum("doc_type", ["DNI", "CUIT", "CUIL", "PASAPORTE", "CONSUMIDOR_FINAL"]);
export const comprobanteTypeEnum = pgEnum("comprobante_type", ["FACTURA_A", "FACTURA_B", "FACTURA_C", "NOTA_CREDITO"]);


// ==========================================
// 2. TABLAS PRINCIPALES (Multi-tenant)
// ==========================================

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  businessName: text("business_name"),
  cuit: text("cuit"),
  puntoVenta: integer("punto_venta").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("CASHIER"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cashSessions = pgTable("cash_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  cashierId: uuid("cashier_id").references(() => users.id).notNull(),
  openedAt: timestamp("opened_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
  initialAmount: decimal("initial_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  finalAmount: decimal("final_amount", { precision: 10, scale: 2 }),
  totalSales: decimal("total_sales", { precision: 10, scale: 2 }).default("0"),
  totalCash: decimal("total_cash", { precision: 10, scale: 2 }).default("0"),
  totalDebit: decimal("total_debit", { precision: 10, scale: 2 }).default("0"),
  totalCredit: decimal("total_credit", { precision: 10, scale: 2 }).default("0"),
});

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
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

export const sales = pgTable("sales", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
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

export const bakeQueue = pgTable("bake_queue", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  quantityNeeded: decimal("quantity_needed", { precision: 10, scale: 3 }).notNull(),
  status: bakeStatusEnum("status").notNull().default("PENDING"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export const alerts = pgTable("alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  type: alertTypeEnum("type").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 3. RELACIONES
// ==========================================

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  products: many(products),
  sales: many(sales),
  bakeQueue: many(bakeQueue),
  alerts: many(alerts),
  cashSessions: many(cashSessions),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  sales: many(sales),
  cashSessions: many(cashSessions),
}));

export const cashSessionsRelations = relations(cashSessions, ({ one, many }) => ({
  tenant: one(tenants, { fields: [cashSessions.tenantId], references: [tenants.id] }),
  cashier: one(users, { fields: [cashSessions.cashierId], references: [users.id] }),
  sales: many(sales),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  tenant: one(tenants, { fields: [products.tenantId], references: [tenants.id] }),
  saleItems: many(saleItems),
  bakeQueue: many(bakeQueue),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  tenant: one(tenants, { fields: [sales.tenantId], references: [tenants.id] }),
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
  product: one(products, { fields: [bakeQueue.productId], references: [products.id] }),
}));
