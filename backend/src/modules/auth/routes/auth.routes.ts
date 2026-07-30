import { Router } from "express";
import { login, logout, me, refresh, register } from "../controllers/auth.controller.js";
import { requireAuthentication } from "../middlewares/auth.middleware.js";
import { validateLogin, validateLogout, validateRefresh, validateRegister } from "../validators/auth.validators.js";

export const authRouter = Router();

authRouter.post("/register", validateRegister, register);
authRouter.post("/login", validateLogin, login);
authRouter.post("/logout", validateLogout, logout);
authRouter.get("/me", requireAuthentication, me);
authRouter.post("/refresh", validateRefresh, refresh);
