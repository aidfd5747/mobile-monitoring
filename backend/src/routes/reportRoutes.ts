import { Router } from "express";
import { ReportController } from "../controllers/reportController";

const router = Router();

router.post("/", ReportController.create);
router.get("/", ReportController.list);

export default router;
