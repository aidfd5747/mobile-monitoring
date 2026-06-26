import { Router } from "express";
import { ReportController } from "../controllers/reportController";
import { adminOnly, authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post("/", authMiddleware, ReportController.create);
router.get("/", authMiddleware, ReportController.list);
router.delete("/:id", authMiddleware, adminOnly, ReportController.delete);
router.patch("/:id/status", authMiddleware, adminOnly, ReportController.updateStatus);

export default router;
