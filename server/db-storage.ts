import { db } from "./db";
import { eq, and, lt, sql } from "drizzle-orm";
import {
  users,
  warehouses,
  inventoryItems,
  productHistory,
  tables,
  tableRows,
  capturedImages,
  auditLogs,
  type User,
  type UpsertUser,
  type Warehouse,
  type InsertWarehouse,
  type InventoryItem,
  type InsertInventoryItem,
  type ProductHistory,
  type InsertProductHistory,
  type Table as DataTable,
  type InsertTable,
  type TableRow,
  type InsertTableRow,
  type CapturedImage,
  type InsertCapturedImage,
  type AuditLog,
  type InsertAuditLog,
  type UpdateUserRole,
} from "@shared/schema";
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  async upsertUser(user: UpsertUser): Promise<User> {
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (existingUser) {
      const [updated] = await db
        .update(users)
        .set({
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(users)
      .values({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        role: "viewer",
      })
      .returning();
    return created;
  }

  async getUserById(id: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user || null;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async updateUserRole(userId: string, { role }: UpdateUserRole): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    if (!updated) throw new Error("User not found");
    return updated;
  }

  async createWarehouse(warehouse: InsertWarehouse): Promise<Warehouse> {
    const [created] = await db.insert(warehouses).values(warehouse).returning();
    return created;
  }

  async getWarehouses(): Promise<Warehouse[]> {
    return db.select().from(warehouses);
  }

  async getWarehouseById(id: string): Promise<Warehouse | null> {
    const [warehouse] = await db.select().from(warehouses).where(eq(warehouses.id, id)).limit(1);
    return warehouse || null;
  }

  async updateWarehouse(id: string, warehouse: Partial<InsertWarehouse>): Promise<Warehouse> {
    const [updated] = await db
      .update(warehouses)
      .set({ ...warehouse, updatedAt: new Date() })
      .where(eq(warehouses.id, id))
      .returning();
    if (!updated) throw new Error("Warehouse not found");
    return updated;
  }

  async deleteWarehouse(id: string): Promise<void> {
    await db.delete(warehouses).where(eq(warehouses.id, id));
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const [created] = await db
      .insert(inventoryItems)
      .values({
        ...item,
        expirationDate: item.expirationDate ? new Date(item.expirationDate) : null,
      })
      .returning();
    return created;
  }

  async getInventoryItems(): Promise<InventoryItem[]> {
    return db.select().from(inventoryItems);
  }

  async getInventoryItemById(id: string): Promise<InventoryItem | null> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).limit(1);
    return item || null;
  }

  async getInventoryByWarehouse(warehouseId: string): Promise<InventoryItem[]> {
    return db.select().from(inventoryItems).where(eq(inventoryItems.warehouseId, warehouseId));
  }

  async updateInventoryItem(id: string, item: Partial<InsertInventoryItem>): Promise<InventoryItem> {
    const [updated] = await db
      .update(inventoryItems)
      .set({
        ...item,
        expirationDate: item.expirationDate ? new Date(item.expirationDate) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.id, id))
      .returning();
    if (!updated) throw new Error("Inventory item not found");
    return updated;
  }

  async deleteInventoryItem(id: string): Promise<void> {
    await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
  }

  async getLowStockItems(threshold = 10): Promise<InventoryItem[]> {
    return db.select().from(inventoryItems).where(lt(inventoryItems.quantity, threshold));
  }

  async getExpiringItems(daysAhead = 30): Promise<InventoryItem[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    return db
      .select()
      .from(inventoryItems)
      .where(
        and(
          sql`${inventoryItems.expirationDate} IS NOT NULL`,
          sql`${inventoryItems.expirationDate} <= ${futureDate}`
        )
      );
  }

  async createProductHistory(history: InsertProductHistory): Promise<ProductHistory> {
    const [created] = await db.insert(productHistory).values(history).returning();
    return created;
  }

  async getProductHistory(inventoryItemId: string): Promise<ProductHistory[]> {
    return db
      .select()
      .from(productHistory)
      .where(eq(productHistory.inventoryItemId, inventoryItemId))
      .orderBy(productHistory.timestamp);
  }

  async createTable(table: InsertTable): Promise<DataTable> {
    const [created] = await db.insert(tables).values(table).returning();
    return created;
  }

  async getTables(): Promise<DataTable[]> {
    return db.select().from(tables);
  }

  async getTableById(id: string): Promise<DataTable | null> {
    const [table] = await db.select().from(tables).where(eq(tables.id, id)).limit(1);
    return table || null;
  }

  async deleteTable(id: string): Promise<void> {
    await db.delete(tables).where(eq(tables.id, id));
  }

  async createTableRow(row: InsertTableRow): Promise<TableRow> {
    const [created] = await db.insert(tableRows).values(row).returning();
    return created;
  }

  async getTableRows(tableId: string): Promise<TableRow[]> {
    return db.select().from(tableRows).where(eq(tableRows.tableId, tableId));
  }

  async deleteTableRow(id: string): Promise<void> {
    await db.delete(tableRows).where(eq(tableRows.id, id));
  }

  async createCapturedImage(image: InsertCapturedImage): Promise<CapturedImage> {
    const [created] = await db.insert(capturedImages).values(image).returning();
    return created;
  }

  async getCapturedImages(): Promise<CapturedImage[]> {
    return db.select().from(capturedImages);
  }

  async getCapturedImageById(id: string): Promise<CapturedImage | null> {
    const [image] = await db.select().from(capturedImages).where(eq(capturedImages.id, id)).limit(1);
    return image || null;
  }

  async updateCapturedImage(id: string, image: Partial<InsertCapturedImage>): Promise<CapturedImage> {
    const [updated] = await db
      .update(capturedImages)
      .set(image)
      .where(eq(capturedImages.id, id))
      .returning();
    if (!updated) throw new Error("Image not found");
    return updated;
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLogs).values(log).returning();
    return created;
  }

  async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    return db
      .select()
      .from(auditLogs)
      .orderBy(auditLogs.timestamp)
      .limit(limit);
  }

  async getDashboardStats() {
    const [warehouseCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(warehouses);

    const [itemCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryItems);

    const [lowStockCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryItems)
      .where(lt(inventoryItems.quantity, 10));

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const [expiringCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryItems)
      .where(
        and(
          sql`${inventoryItems.expirationDate} IS NOT NULL`,
          sql`${inventoryItems.expirationDate} <= ${futureDate}`
        )
      );

    const recentLogs = await db
      .select()
      .from(auditLogs)
      .orderBy(sql`${auditLogs.timestamp} DESC`)
      .limit(5);

    return {
      totalWarehouses: warehouseCount?.count || 0,
      totalInventoryItems: itemCount?.count || 0,
      lowStockCount: lowStockCount?.count || 0,
      expiringCount: expiringCount?.count || 0,
      recentActivity: recentLogs.map((log) => ({
        type: log.action,
        description: log.action,
        timestamp: log.timestamp.toISOString(),
      })),
    };
  }
}

export const storage = new DatabaseStorage();
