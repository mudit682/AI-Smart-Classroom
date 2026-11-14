import { Router } from "express";
import { createTeacherAccount, login, logout, me, refresh, register } from "../controllers/auth.controller.js";
import { requireAuthentication } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../../students/middlewares/student-access.middleware.js";
import {
  validateCreateTeacherAccount,
  validateLogin,
  validateLogout,
  validateRefresh,
  validateRegister
} from "../validators/auth.validators.js";

export const authRouter = Router();

authRouter.post("/register", requireAuthentication, allowRoles("admin"), validateRegister, register);
authRouter.post(
  "/teacher-accounts",
  requireAuthentication,
  allowRoles("admin"),
  validateCreateTeacherAccount,
  createTeacherAccount
);
authRouter.post("/login", validateLogin, login);
authRouter.post("/logout", validateLogout, logout);
authRouter.get("/me", requireAuthentication, me);
authRouter.post("/refresh", validateRefresh, refresh);
