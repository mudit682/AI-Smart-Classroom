import type { Request, Response, NextFunction } from "express";
import type { LoginRequest } from "../dtos/login.dto.js";
import type { LogoutRequest, RefreshTokenRequest } from "../dtos/refresh-token.dto.js";
import type { RegisterRequest } from "../dtos/register.dto.js";
import { authService } from "../services/auth.service.js";

export async function register(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.register(request.body as RegisterRequest);

    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function login(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.login(request.body as LoginRequest);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function logout(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.logout(request.body as LogoutRequest);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function me(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.getCurrentUser(request.user?.userId);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function refresh(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.refresh(request.body as RefreshTokenRequest);

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
