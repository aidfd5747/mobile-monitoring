import { Request, Response } from "express";

import jwt from "jsonwebtoken";

import { AuthService } from "../services/authService";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

export class AuthController {
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

  static async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;

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

      const { username, password } = req.body;

      if (!username && !password) {
        return res.status(400).json({ message: "Username atau password harus diisi" });
      }

      const updatedUser = await AuthService.updateUser(userId, {
        username: username?.trim(),
        password: password?.trim(),
      });

      return res.json({ user: updatedUser });
    } catch (error) {
      console.error(error);
      return res.status(400).json({ message: error instanceof Error ? error.message : "Gagal memperbarui profil" });
    }
  }

  static async login(
    req: Request,
    res: Response
  ) {
    try {
      const {
        username,
        password,
      } = req.body;

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