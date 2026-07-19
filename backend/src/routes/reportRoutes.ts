// reportRoutes.ts
// Route untuk operasi CRUD laporan, hanya user terautentikasi yang dapat akses.
import { Router } from "express";
import { ReportController } from "../controllers/reportController";
import { adminOnly, authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// Buat laporan baru.
router.post("/", authMiddleware, ReportController.create);
// Ambil daftar notifikasi user.
router.get("/notifications", authMiddleware, ReportController.notifications);
// Ambil daftar laporan.
router.get("/", authMiddleware, ReportController.list);
// Perbarui laporan yang belum selesai.
router.patch("/:id", authMiddleware, ReportController.update);
// Hapus laporan berdasarkan ID (admin saja).
router.delete("/:id", authMiddleware, adminOnly, ReportController.delete);
// Perbarui status laporan (admin saja).
router.patch("/:id/status", authMiddleware, adminOnly, ReportController.updateStatus);

export default router;
