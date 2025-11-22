import type { Request, Response, NextFunction } from "express";
import type { User } from "@shared/schema";
import { storage } from "./db-storage";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export async function isAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = req.session?.userId;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized: No user session" });
  }

  try {
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }

    next();
  };
}

export async function auditLog(
  userId: string | undefined,
  action: string,
  endpoint: string,
  method: string,
  details?: any,
  ipAddress?: string
) {
  try {
    await storage.createAuditLog({
      userId: userId || null,
      action,
      endpoint,
      method,
      metadata: details ?? {},
      ipAddress: ipAddress || null,
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}
