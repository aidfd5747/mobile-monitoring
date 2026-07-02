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

router.get(
  "/users",
  authMiddleware,
  adminOnly,
  AuthController.listUsers
);

router.get(
  "/profile",
  authMiddleware,
  AuthController.getProfile
);

router.patch(
  "/profile",
  authMiddleware,
  AuthController.updateProfile
);

router.delete(
  "/users/:id",
  authMiddleware,
  adminOnly,
  AuthController.deleteUser
);

export default router;