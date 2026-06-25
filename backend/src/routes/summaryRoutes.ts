import { Router } from "express";
import { SummaryController } from "../controllers/summaryController";

const router = Router();

router.get("/", SummaryController.getSummary);

export default router;
