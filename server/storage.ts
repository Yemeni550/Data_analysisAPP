import type {
  User,
  UpsertUser,
  Warehouse,
  InsertWarehouse,
  InventoryItem,
  InsertInventoryItem,
  ProductHistory,
  InsertProductHistory,
  Table as DataTable,
  InsertTable,
  TableRow,
  InsertTableRow,
  CapturedImage,
  InsertCapturedImage,
  AuditLog,
  InsertAuditLog,
  UpdateUserRole,
} from "@shared/schema";

export interface IStorage {
  // Users
  upsertUser(user: UpsertUser): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, role: UpdateUserRole): Promise<User>;

  // Warehouses
  createWarehouse(warehouse: InsertWarehouse): Promise<Warehouse>;
  getWarehouses(): Promise<Warehouse[]>;
  getWarehouseById(id: string): Promise<Warehouse | null>;
  updateWarehouse(id: string, warehouse: Partial<InsertWarehouse>): Promise<Warehouse>;
  deleteWarehouse(id: string): Promise<void>;

  // Inventory
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  getInventoryItems(): Promise<InventoryItem[]>;
  getInventoryItemById(id: string): Promise<InventoryItem | null>;
  getInventoryByWarehouse(warehouseId: string): Promise<InventoryItem[]>;
  updateInventoryItem(id: string, item: Partial<InsertInventoryItem>): Promise<InventoryItem>;
  deleteInventoryItem(id: string): Promise<void>;
  getLowStockItems(threshold?: number): Promise<InventoryItem[]>;
  getExpiringItems(daysAhead?: number): Promise<InventoryItem[]>;

  // Product History
  createProductHistory(history: InsertProductHistory): Promise<ProductHistory>;
  getProductHistory(inventoryItemId: string): Promise<ProductHistory[]>;

  // Tables
  createTable(table: InsertTable): Promise<DataTable>;
  getTables(): Promise<DataTable[]>;
  getTableById(id: string): Promise<DataTable | null>;
  deleteTable(id: string): Promise<void>;

  // Table Rows
  createTableRow(row: InsertTableRow): Promise<TableRow>;
  getTableRows(tableId: string): Promise<TableRow[]>;
  deleteTableRow(id: string): Promise<void>;

  // Captured Images
  createCapturedImage(image: InsertCapturedImage): Promise<CapturedImage>;
  getCapturedImages(): Promise<CapturedImage[]>;
  getCapturedImageById(id: string): Promise<CapturedImage | null>;
  updateCapturedImage(id: string, image: Partial<InsertCapturedImage>): Promise<CapturedImage>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;

  // Dashboard Stats
  getDashboardStats(): Promise<{
    totalWarehouses: number;
    totalInventoryItems: number;
    lowStockCount: number;
    expiringCount: number;
    recentActivity: Array<{
      type: string;
      description: string;
      timestamp: string;
    }>;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private warehouses: Map<string, Warehouse> = new Map();
  private inventoryItems: Map<string, InventoryItem> = new Map();
  private productHistory: Map<string, ProductHistory[]> = new Map();
  private tables: Map<string, DataTable> = new Map();
  private tableRows: Map<string, TableRow[]> = new Map();
  private capturedImages: Map<string, CapturedImage> = new Map();
  private auditLogs: AuditLog[] = [];

  async upsertUser(user: UpsertUser): Promise<User> {
    const existing = this.users.get(user.id);
    const now = new Date();
    const fullUser: User = {
      ...user,
      role: existing?.role || "viewer",
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    this.users.set(user.id, fullUser);
    return fullUser;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUserRole(userId: string, { role }: UpdateUserRole): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    user.role = role;
    user.updatedAt = new Date();
    return user;
  }

  async createWarehouse(warehouse: InsertWarehouse): Promise<Warehouse> {
    const id = `wh_${Date.now()}`;
    const now = new Date();
    const newWarehouse: Warehouse = {
      id,
      name: warehouse.name,
      location: warehouse.location ?? null,
      description: warehouse.description ?? null,
      capacity: warehouse.capacity ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    this.warehouses.set(id, newWarehouse);
    return newWarehouse;
  }

  async getWarehouses(): Promise<Warehouse[]> {
    return Array.from(this.warehouses.values());
  }

  async getWarehouseById(id: string): Promise<Warehouse | null> {
    return this.warehouses.get(id) || null;
  }

  async updateWarehouse(id: string, warehouse: Partial<InsertWarehouse>): Promise<Warehouse> {
    const existing = this.warehouses.get(id);
    if (!existing) throw new Error("Warehouse not found");
    const updated = { ...existing, ...warehouse, updatedAt: new Date() };
    this.warehouses.set(id, updated);
    return updated;
  }

  async deleteWarehouse(id: string): Promise<void> {
    this.warehouses.delete(id);
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const id = `inv_${Date.now()}`;
    const now = new Date();
    const newItem: InventoryItem = {
      id,
      name: item.name,
      warehouseId: item.warehouseId,
      sku: item.sku,
      category: item.category ?? null,
      quantity: item.quantity ?? 0,
      unit: item.unit ?? "pcs",
      batchNumber: item.batchNumber ?? null,
      expirationDate: item.expirationDate ? new Date(item.expirationDate) : null,
      location: item.location ?? null,
      description: item.description ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.inventoryItems.set(id, newItem);
    return newItem;
  }

  async getInventoryItems(): Promise<InventoryItem[]> {
    return Array.from(this.inventoryItems.values());
  }

  async getInventoryItemById(id: string): Promise<InventoryItem | null> {
    return this.inventoryItems.get(id) || null;
  }

  async getInventoryByWarehouse(warehouseId: string): Promise<InventoryItem[]> {
    return Array.from(this.inventoryItems.values()).filter(
      (item) => item.warehouseId === warehouseId
    );
  }

  async updateInventoryItem(id: string, item: Partial<InsertInventoryItem>): Promise<InventoryItem> {
    const existing = this.inventoryItems.get(id);
    if (!existing) throw new Error("Inventory item not found");
    const updated = {
      ...existing,
      ...item,
      expirationDate: item.expirationDate ? new Date(item.expirationDate) : existing.expirationDate,
      updatedAt: new Date(),
    };
    this.inventoryItems.set(id, updated);
    return updated;
  }

  async deleteInventoryItem(id: string): Promise<void> {
    this.inventoryItems.delete(id);
  }

  async getLowStockItems(threshold = 10): Promise<InventoryItem[]> {
    return Array.from(this.inventoryItems.values()).filter(
      (item) => item.quantity < threshold
    );
  }

  async getExpiringItems(daysAhead = 30): Promise<InventoryItem[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    return Array.from(this.inventoryItems.values()).filter(
      (item) => item.expirationDate && new Date(item.expirationDate) <= futureDate
    );
  }

  async createProductHistory(history: InsertProductHistory): Promise<ProductHistory> {
    const id = `hist_${Date.now()}`;
    const newHistory: ProductHistory = {
      id,
      inventoryItemId: history.inventoryItemId,
      actionType: history.actionType,
      quantityChange: history.quantityChange,
      previousQuantity: history.previousQuantity,
      newQuantity: history.newQuantity,
      userId: history.userId ?? null,
      notes: history.notes ?? null,
      timestamp: new Date(),
    };
    const existing = this.productHistory.get(history.inventoryItemId) || [];
    this.productHistory.set(history.inventoryItemId, [...existing, newHistory]);
    return newHistory;
  }

  async getProductHistory(inventoryItemId: string): Promise<ProductHistory[]> {
    return this.productHistory.get(inventoryItemId) || [];
  }

  async createTable(table: InsertTable): Promise<DataTable> {
    const id = `tbl_${Date.now()}`;
    const now = new Date();
    const newTable: DataTable = {
      id,
      name: table.name,
      description: table.description ?? null,
      createdBy: table.createdBy ?? null,
      createdAt: now,
    };
    this.tables.set(id, newTable);
    return newTable;
  }

  async getTables(): Promise<DataTable[]> {
    return Array.from(this.tables.values());
  }

  async getTableById(id: string): Promise<DataTable | null> {
    return this.tables.get(id) || null;
  }

  async deleteTable(id: string): Promise<void> {
    this.tables.delete(id);
    this.tableRows.delete(id);
  }

  async createTableRow(row: InsertTableRow): Promise<TableRow> {
    const id = `row_${Date.now()}`;
    const newRow: TableRow = { id, ...row, createdAt: new Date() };
    const existing = this.tableRows.get(row.tableId) || [];
    this.tableRows.set(row.tableId, [...existing, newRow]);
    return newRow;
  }

  async getTableRows(tableId: string): Promise<TableRow[]> {
    return this.tableRows.get(tableId) || [];
  }

  async deleteTableRow(id: string): Promise<void> {
    for (const [tableId, rows] of Array.from(this.tableRows.entries())) {
      const filtered = rows.filter((row: TableRow) => row.id !== id);
      if (filtered.length !== rows.length) {
        this.tableRows.set(tableId, filtered);
        return;
      }
    }
  }

  async createCapturedImage(image: InsertCapturedImage): Promise<CapturedImage> {
    const id = `img_${Date.now()}`;
    const newImage: CapturedImage = {
      id,
      url: image.url,
      filename: image.filename,
      metadata: image.metadata ?? {},
      ocrText: image.ocrText ?? null,
      processedData: image.processedData ?? {},
      processingStatus: image.processingStatus ?? "pending",
      uploadedBy: image.uploadedBy,
      createdAt: new Date(),
    };
    this.capturedImages.set(id, newImage);
    return newImage;
  }

  async getCapturedImages(): Promise<CapturedImage[]> {
    return Array.from(this.capturedImages.values());
  }

  async getCapturedImageById(id: string): Promise<CapturedImage | null> {
    return this.capturedImages.get(id) || null;
  }

  async updateCapturedImage(id: string, image: Partial<InsertCapturedImage>): Promise<CapturedImage> {
    const existing = this.capturedImages.get(id);
    if (!existing) throw new Error("Image not found");
    const updated = { ...existing, ...image };
    this.capturedImages.set(id, updated);
    return updated;
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const id = `log_${Date.now()}`;
    const newLog: AuditLog = {
      id,
      userId: log.userId ?? null,
      action: log.action,
      endpoint: log.endpoint,
      method: log.method,
      metadata: log.metadata ?? {},
      ipAddress: log.ipAddress ?? null,
      timestamp: new Date(),
    };
    this.auditLogs.push(newLog);
    return newLog;
  }

  async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    return this.auditLogs.slice(-limit);
  }

  async getDashboardStats() {
    const warehouses = await this.getWarehouses();
    const items = await this.getInventoryItems();
    const lowStock = await this.getLowStockItems();
    const expiring = await this.getExpiringItems();

    return {
      totalWarehouses: warehouses.length,
      totalInventoryItems: items.length,
      lowStockCount: lowStock.length,
      expiringCount: expiring.length,
      recentActivity: this.auditLogs.slice(-5).reverse().map((log) => ({
        type: log.action,
        description: log.action,
        timestamp: log.timestamp.toISOString(),
      })),
    };
  }
}
