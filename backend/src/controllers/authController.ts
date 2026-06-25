import { Request, Response } from "express";

import jwt from "jsonwebtoken";

import { AuthService } from "../services/authService";

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