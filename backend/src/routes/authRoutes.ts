// authRoutes.ts
// Definisi route untuk autentikasi, manajemen user, dan profil.
import { Router } from "express";

import { AuthController }
  from "../controllers/authController";
import { adminOnly, authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// Login user dan menghasilkan JWT.
router.post(
  "/login",
  AuthController.login
);

// Hanya admin yang dapat membuat akun worker.
router.post(
  "/users",
  authMiddleware,
  adminOnly,
  AuthController.createUser
);

router.get(
  "/users",
  authMiddleware,
  adminOnly,
  AuthController.listUsers
);

// Ambil profil user yang sedang login.
router.get(
  "/profile",
  authMiddleware,
  AuthController.getProfile
);

// Simpan token push Expo perangkat user untuk notifikasi real-time.
router.post(
  "/push-token",
  authMiddleware,
  AuthController.savePushToken
);

// Perbarui username atau password user yang sedang login.
router.patch(
  "/profile",
  authMiddleware,
  AuthController.updateProfile
);

// Hapus akun worker berdasarkan ID.
router.delete(
  "/users/:id",
  authMiddleware,
  adminOnly,
  AuthController.deleteUser
);

export default router;