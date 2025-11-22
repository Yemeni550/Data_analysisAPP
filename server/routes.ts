import type { Express, Request, Response } from "express";
import { createServer } from "http";
import { storage } from "./db-storage";
import { isAuthenticated, requireRole, auditLog } from "./auth";
import {
  insertWarehouseSchema,
  insertInventoryItemSchema,
  insertTableSchema,
  updateUserRoleSchema,
} from "@shared/schema";
import OpenAI from "openai";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export function registerRoutes(app: Express) {
  const server = createServer(app);
  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    res.json(req.user);
  });

  // Dashboard
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error: any) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Warehouses
  app.get("/api/warehouses", isAuthenticated, async (req, res) => {
    try {
      const warehouses = await storage.getWarehouses();
      res.json(warehouses);
    } catch (error: any) {
      console.error("Get warehouses error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/warehouses/:id", isAuthenticated, async (req, res) => {
    try {
      const warehouse = await storage.getWarehouseById(req.params.id);
      if (!warehouse) {
        return res.status(404).json({ message: "Warehouse not found" });
      }
      res.json(warehouse);
    } catch (error: any) {
      console.error("Get warehouse error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/warehouses", isAuthenticated, requireRole("super_admin", "admin", "manager"), async (req, res) => {
    try {
      const data = insertWarehouseSchema.parse(req.body);
      const warehouse = await storage.createWarehouse(data);
      await auditLog(req.user?.id, "CREATE_WAREHOUSE", "/api/warehouses", "POST", { warehouseId: warehouse.id }, req.ip);
      res.status(201).json(warehouse);
    } catch (error: any) {
      console.error("Create warehouse error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/warehouses/:id", isAuthenticated, requireRole("super_admin", "admin", "manager"), async (req, res) => {
    try {
      const data = insertWarehouseSchema.partial().parse(req.body);
      const warehouse = await storage.updateWarehouse(req.params.id, data);
      await auditLog(req.user?.id, "UPDATE_WAREHOUSE", `/api/warehouses/${req.params.id}`, "PATCH", { warehouseId: req.params.id }, req.ip);
      res.json(warehouse);
    } catch (error: any) {
      console.error("Update warehouse error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/warehouses/:id", isAuthenticated, requireRole("super_admin", "admin"), async (req, res) => {
    try {
      await storage.deleteWarehouse(req.params.id);
      await auditLog(req.user?.id, "DELETE_WAREHOUSE", `/api/warehouses/${req.params.id}`, "DELETE", { warehouseId: req.params.id }, req.ip);
      res.status(204).send();
    } catch (error: any) {
      console.error("Delete warehouse error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Inventory
  app.get("/api/inventory", isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getInventoryItems();
      res.json(items);
    } catch (error: any) {
      console.error("Get inventory error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/inventory/:id", isAuthenticated, async (req, res) => {
    try {
      const item = await storage.getInventoryItemById(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(item);
    } catch (error: any) {
      console.error("Get inventory item error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/inventory", isAuthenticated, requireRole("super_admin", "admin", "manager"), async (req, res) => {
    try {
      const data = insertInventoryItemSchema.parse(req.body);
      const item = await storage.createInventoryItem(data);

      await storage.createProductHistory({
        inventoryItemId: item.id,
        actionType: "in",
        quantityChange: item.quantity,
        previousQuantity: 0,
        newQuantity: item.quantity,
        userId: req.user?.id || null,
        notes: "Initial inventory",
      });

      await auditLog(req.user?.id, "CREATE_INVENTORY", "/api/inventory", "POST", { itemId: item.id, sku: item.sku }, req.ip);
      res.status(201).json(item);
    } catch (error: any) {
      console.error("Create inventory error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/inventory/:id", isAuthenticated, requireRole("super_admin", "admin", "manager"), async (req, res) => {
    try {
      const currentItem = await storage.getInventoryItemById(req.params.id);
      if (!currentItem) {
        return res.status(404).json({ message: "Item not found" });
      }

      const data = insertInventoryItemSchema.partial().parse(req.body);
      const item = await storage.updateInventoryItem(req.params.id, data);

      if (data.quantity !== undefined && data.quantity !== currentItem.quantity) {
        await storage.createProductHistory({
          inventoryItemId: item.id,
          actionType: "adjust",
          quantityChange: data.quantity - currentItem.quantity,
          previousQuantity: currentItem.quantity,
          newQuantity: data.quantity,
          userId: req.user?.id || null,
          notes: "Quantity adjusted",
        });
      }

      await auditLog(req.user?.id, "UPDATE_INVENTORY", `/api/inventory/${req.params.id}`, "PATCH", { itemId: req.params.id }, req.ip);
      res.json(item);
    } catch (error: any) {
      console.error("Update inventory error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/inventory/:id", isAuthenticated, requireRole("super_admin", "admin"), async (req, res) => {
    try {
      await storage.deleteInventoryItem(req.params.id);
      await auditLog(req.user?.id, "DELETE_INVENTORY", `/api/inventory/${req.params.id}`, "DELETE", { itemId: req.params.id }, req.ip);
      res.status(204).send();
    } catch (error: any) {
      console.error("Delete inventory error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Tables
  app.get("/api/tables", isAuthenticated, async (req, res) => {
    try {
      const tables = await storage.getTables();
      res.json(tables);
    } catch (error: any) {
      console.error("Get tables error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/tables/:id", isAuthenticated, async (req, res) => {
    try {
      const table = await storage.getTableById(req.params.id);
      if (!table) {
        return res.status(404).json({ message: "Table not found" });
      }
      res.json(table);
    } catch (error: any) {
      console.error("Get table error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/tables", isAuthenticated, async (req, res) => {
    try {
      const data = insertTableSchema.parse({
        ...req.body,
        createdBy: req.user?.id,
      });
      const table = await storage.createTable(data);
      await auditLog(req.user?.id, "CREATE_TABLE", "/api/tables", "POST", { tableId: table.id }, req.ip);
      res.status(201).json(table);
    } catch (error: any) {
      console.error("Create table error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/tables/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteTable(req.params.id);
      await auditLog(req.user?.id, "DELETE_TABLE", `/api/tables/${req.params.id}`, "DELETE", { tableId: req.params.id }, req.ip);
      res.status(204).send();
    } catch (error: any) {
      console.error("Delete table error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Image upload and AI processing
  app.post("/api/images/upload", isAuthenticated, upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const base64Image = req.file.buffer.toString("base64");
      const imageUrl = `data:${req.file.mimetype};base64,${base64Image}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: 'Analyze this product image and extract the following information if visible: product name, SKU/barcode number, category, batch number, expiration date (format: YYYY-MM-DD), and any other relevant product details. Return the data as a JSON object with keys: productName, sku, category, batchNumber, expirationDate, description, and confidence (0-1).',
              },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      let extractedData = {};

      if (content) {
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            extractedData = JSON.parse(jsonMatch[0]);
          }
        } catch (parseError) {
          console.error("Failed to parse OpenAI response:", parseError);
        }
      }

      const capturedImage = await storage.createCapturedImage({
        url: imageUrl,
        filename: req.file.originalname,
        metadata: {
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
        ocrText: content || null,
        processedData: extractedData,
        processingStatus: "completed",
        uploadedBy: req.user?.id || "",
      });

      await auditLog(req.user?.id, "UPLOAD_IMAGE", "/api/images/upload", "POST", { imageId: capturedImage.id }, req.ip);

      res.json({
        id: capturedImage.id,
        extractedData,
        confidence: (extractedData as any).confidence || 0.8,
      });
    } catch (error: any) {
      console.error("Image upload error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // User management
  app.get("/api/users", isAuthenticated, requireRole("super_admin", "admin"), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      console.error("Get users error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/users/:id/role", isAuthenticated, requireRole("super_admin", "admin"), async (req, res) => {
    try {
      const data = updateUserRoleSchema.parse(req.body);
      
      if (data.role === "super_admin" && req.user?.role !== "super_admin") {
        return res.status(403).json({ message: "Only super admins can assign super admin role" });
      }

      const user = await storage.updateUserRole(req.params.id, data);
      await auditLog(req.user?.id, "UPDATE_USER_ROLE", `/api/users/${req.params.id}/role`, "PATCH", { userId: req.params.id, newRole: data.role }, req.ip);
      res.json(user);
    } catch (error: any) {
      console.error("Update user role error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  return server;
}
