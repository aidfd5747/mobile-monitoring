// authMiddleware.ts
// Middleware autentikasi JWT untuk memastikan hanya user terautentikasi
// dapat mengakses route tertentu.
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  // Properti user ditambahkan ke request setelah token berhasil diverifikasi.
  user?: {
    id?: string;
    role?: string;
  };
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Ambil header Authorization dari request.
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token tidak tersedia" });
  }

  try {
    // Pisahkan token Bearer dari header.
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "development-secret") as {
      id?: string;
      role?: string;
    };

    // Simpan data user yang didekode di request.
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token tidak valid" });
  }
};

export const adminOnly = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Middleware untuk membatasi akses hanya ke user dengan peran admin.
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Akses hanya untuk admin" });
  }

  next();
};
