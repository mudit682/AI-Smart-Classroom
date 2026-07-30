import type { RequestHandler } from "express";
import { ValidationError } from "../../../shared/errors/index.js";

function validationPlaceholder(name: string): RequestHandler {
  return (_request, _response, next) => {
    void name;
    next();
  };
}

export const validateRegister = validationPlaceholder("register");
export const validateLogin: RequestHandler = (request, _response, next) => {
  const { email, password } = request.body as { email?: unknown; password?: unknown };

  if (typeof email !== "string" || typeof password !== "string") {
    next(new ValidationError("Email and password are required."));
    return;
  }

  next();
};
export const validateRefresh: RequestHandler = (request, _response, next) => {
  const { refreshToken } = request.body as { refreshToken?: unknown };

  if (typeof refreshToken !== "string" || refreshToken.trim().length === 0) {
    next(new ValidationError("Refresh token is required."));
    return;
  }

  next();
};

export const validateLogout = validateRefresh;
