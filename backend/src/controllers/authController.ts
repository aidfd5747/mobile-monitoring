// authController.ts
// Mengatur logika endpoint autentikasi, profil, dan manajemen user.
import { Request, Response } from "express";

import jwt from "jsonwebtoken";

import { AuthService } from "../services/authService";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

// Utility untuk memastikan field body berisi string.
const getStringValue = (value: unknown): string =>
  typeof value === "string" ? value : "";

export class AuthController {
  // Endpoint untuk membuat akun worker baru.
  static async createUser(req: Request, res: Response) {
    try {
      const { nama, username, password, role } = req.body;

      if (!nama || !username || !password || !role) {
        return res.status(400).json({ message: "Nama, username, password, dan role wajib diisi" });
      }

      const user = await AuthService.createUser({
        nama,
        username,
        password,
        role,
      });

      return res.status(201).json({ message: "Akun berhasil dibuat", user });
    } catch (error) {
      console.error(error);
      return res.status(400).json({ message: error instanceof Error ? error.message : "Gagal membuat akun" });
    }
  }

  // Endpoint untuk mengambil daftar user dengan peran worker.
  static async listUsers(req: Request, res: Response) {
    try {
      const users = await AuthService.listUsers();
      const workers = users.filter((user) => user.role === "worker" || user.role === "petugas");
      return res.json({ users: workers });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Gagal mengambil daftar worker" });
    }
  }

  // Endpoint untuk menghapus akun worker berdasarkan ID.
  static async deleteUser(req: Request, res: Response) {
    try {
      const id = getStringValue(req.params.id);

      if (!id) {
        return res.status(400).json({ message: "ID user wajib disertakan" });
      }

      const targetUser = await AuthService.findUserById(id);

      if (!targetUser) {
        return res.status(404).json({ message: "User tidak ditemukan" });
      }

      if (targetUser.role !== "worker" && targetUser.role !== "petugas") {
        return res.status(403).json({ message: "Hanya akun worker yang dapat dihapus" });
      }

      if ((req as any).user?.id === id) {
        return res.status(400).json({ message: "Tidak dapat menghapus akun sendiri" });
      }

      await AuthService.deleteUser(id);
      return res.json({ message: "Akun worker berhasil dihapus" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Gagal menghapus akun worker" });
    }
  }

  // Endpoint untuk mengambil data profil user yang sedang login.
  static async getProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Token tidak valid" });
      }

      const user = await AuthService.findUserById(userId);

      if (!user) {
        return res.status(404).json({ message: "User tidak ditemukan" });
      }

      return res.json({ user });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Gagal mengambil profil" });
    }
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Token tidak valid" });
      }

      const username = getStringValue(req.body.username);
      const password = getStringValue(req.body.password);
      const nama = getStringValue(req.body.nama);

      if (!username && !password && !nama) {
        return res.status(400).json({ message: "Username, password, atau nama harus diisi" });
      }

      const updatedUser = await AuthService.updateUser(userId, {
        username: username.trim() || undefined,
        password: password.trim() || undefined,
        nama: nama.trim() || undefined,
      });

      return res.json({ user: updatedUser });
    } catch (error) {
      console.error(error);
      return res.status(400).json({ message: error instanceof Error ? error.message : "Gagal memperbarui profil" });
    }
  }

  static async savePushToken(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const expoPushToken = getStringValue(req.body.expoPushToken);

      if (!userId) {
        return res.status(401).json({ message: "Token tidak valid" });
      }

      if (!expoPushToken) {
        return res.status(400).json({ message: "expoPushToken wajib diisi" });
      }

      console.log("[backend] savePushToken request", { userId, role: req.user?.role, expoPushToken });
      const savedToken = await AuthService.savePushToken({
        userId,
        role: req.user?.role,
        expoPushToken,
      });

      console.log("[backend] savePushToken success", savedToken);
      return res.json({ message: "Token push berhasil disimpan", token: savedToken });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Gagal menyimpan token push" });
    }
  }

  static async login(
    req: Request,
    res: Response
  ) {
    try {
      const username = getStringValue(req.body.username);
      const password = getStringValue(req.body.password);

      const user =
        await AuthService.findUserByUsername(
          username
        );

      if (!user) {
        return res.status(401).json({
          message:
            "Username tidak ditemukan",
        });
      }

      const validPassword =
        await AuthService.verifyPassword(
          password,
          user.password
        );

      if (!validPassword) {
        return res.status(401).json({
          message:
            "Password salah",
        });
      }

      const token =
        jwt.sign(
          {
            id: user.id,
            role: user.role,
          },
          process.env.JWT_SECRET || "development-secret",
          {
            expiresIn: "1d",
          }
        );

      return res.json({
        token,
        user: {
          id: user.id,
          nama: user.nama,
          role: user.role,
        },
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message:
          "Internal Server Error",
      });
    }
  }
}