import { Router } from "express";

import { AuthController }
  from "../controllers/authController";
import { adminOnly, authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post(
  "/login",
  AuthController.login
);

router.post(
  "/users",
  authMiddleware,
  adminOnly,
  AuthController.createUser
);

export default router;