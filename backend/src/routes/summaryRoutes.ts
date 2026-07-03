// summaryRoutes.ts
// Route untuk mendapatkan ringkasan statistik laporan.
import { Router } from "express";
import { SummaryController } from "../controllers/summaryController";

const router = Router();

// Ambil ringkasan dashboard laporan.
router.get("/", SummaryController.getSummary);

export default router;
