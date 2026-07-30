import type { RequestHandler } from "express";
import { AppError, AuthenticationError } from "../../../shared/errors/index.js";
import type { UserRole } from "../../users/user.model.js";

export function allowRoles(...roles: UserRole[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.user) {
      next(new AuthenticationError("Authentication is required."));
      return;
    }

    if (!roles.includes(request.user.role)) {
      next(new AppError("You are not authorized to access this resource.", 403, { code: "AUTHORIZATION_ERROR" }));
      return;
    }

    next();
  };
}

