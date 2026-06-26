import { Router } from "express";
import { ReportController } from "../controllers/reportController";
import { adminOnly, authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post("/", authMiddleware, ReportController.create);
router.get("/", authMiddleware, ReportController.list);
router.patch("/:id/status", authMiddleware, adminOnly, ReportController.updateStatus);

export default router;
