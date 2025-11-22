import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoles = ["super_admin", "admin", "manager", "viewer"] as const;
export type UserRole = (typeof userRoles)[number];

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  role: text("role", { enum: userRoles }).notNull().default("viewer" as UserRole),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
});

export const warehouses = pgTable("warehouses", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  description: text("description"),
  capacity: integer("capacity").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
});

export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  warehouseId: uuid("warehouse_id")
    .notNull()
    .references(() => warehouses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sku: text("sku").notNull(),
  category: text("category"),
  quantity: integer("quantity").default(0).notNull(),
  unit: text("unit").default("pcs").notNull(),
  batchNumber: text("batch_number"),
  expirationDate: timestamp("expiration_date", { withTimezone: false }),
  location: text("location"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
});

export const productHistory = pgTable("product_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  inventoryItemId: uuid("inventory_item_id")
    .notNull()
    .references(() => inventoryItems.id, { onDelete: "cascade" }),
  actionType: text("action_type").notNull(),
  quantityChange: integer("quantity_change").notNull(),
  previousQuantity: integer("previous_quantity").notNull(),
  newQuantity: integer("new_quantity").notNull(),
  userId: text("user_id"),
  notes: text("notes"),
  timestamp: timestamp("timestamp", { withTimezone: false }).defaultNow().notNull(),
});

export const tables = pgTable("tables", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
});

export const tableRows = pgTable("table_rows", {
  id: uuid("id").defaultRandom().primaryKey(),
  tableId: uuid("table_id")
    .notNull()
    .references(() => tables.id, { onDelete: "cascade" }),
  data: jsonb("data").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
});

export const capturedImages = pgTable("captured_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  url: text("url").notNull(),
  filename: text("filename").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ocrText: text("ocr_text"),
  processedData: jsonb("processed_data").$type<Record<string, unknown>>().default({}).notNull(),
  processingStatus: text("processing_status").notNull().default("pending"),
  uploadedBy: text("uploaded_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id"),
  action: text("action").notNull(),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ipAddress: text("ip_address"),
  timestamp: timestamp("timestamp", { withTimezone: false }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  tables: many(tables, { relationName: "table_creator" }),
}));

export const warehouseRelations = relations(warehouses, ({ many }) => ({
  inventoryItems: many(inventoryItems),
}));

export const inventoryRelations = relations(inventoryItems, ({ one, many }) => ({
  warehouse: one(warehouses, {
    fields: [inventoryItems.warehouseId],
    references: [warehouses.id],
  }),
  history: many(productHistory),
}));

export const tableRelations = relations(tables, ({ many }) => ({
  rows: many(tableRows),
}));

export const capturedImageRelations = relations(capturedImages, ({ one }) => ({
  uploader: one(users, {
    fields: [capturedImages.uploadedBy],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type UpsertUser = Pick<
  User,
  "id" | "email" | "firstName" | "lastName" | "profileImageUrl"
>;
export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = typeof warehouses.$inferInsert;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = typeof inventoryItems.$inferInsert;
export type ProductHistory = typeof productHistory.$inferSelect;
export type InsertProductHistory = typeof productHistory.$inferInsert;
export type Table = typeof tables.$inferSelect;
export type InsertTable = typeof tables.$inferInsert;
export type TableRow = typeof tableRows.$inferSelect;
export type InsertTableRow = typeof tableRows.$inferInsert;
export type CapturedImage = typeof capturedImages.$inferSelect;
export type InsertCapturedImage = typeof capturedImages.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type UpdateUserRole = { role: UserRole };

const dateOrNull = z
  .union([z.string(), z.date()])
  .nullable()
  .transform((value: string | Date | null | undefined) => {
    if (!value) return null;
    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  });

export const insertWarehouseSchema = createInsertSchema(warehouses, {
  name: z.string().min(1, "Name is required"),
  capacity: z.number().int().nonnegative().default(0),
  location: z.string().optional(),
  description: z.string().optional(),
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems, {
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  quantity: z.number().int().nonnegative().default(0),
  category: z.string().optional(),
  batchNumber: z.string().optional(),
  expirationDate: dateOrNull,
  location: z.string().optional(),
  description: z.string().optional(),
});

export const insertTableSchema = createInsertSchema(tables, {
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  createdBy: z.string().optional(),
});

export const insertTableRowSchema = createInsertSchema(tableRows, {
  data: z.record(z.any()),
});

export const insertCapturedImageSchema = createInsertSchema(capturedImages, {
  metadata: z.record(z.any()).default({}),
  processedData: z.record(z.any()).default({}),
  processingStatus: z.string().default("pending"),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs, {
  metadata: z.record(z.any()).default({}),
});

export const insertProductHistorySchema = createInsertSchema(productHistory, {
  notes: z.string().optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(userRoles),
});
