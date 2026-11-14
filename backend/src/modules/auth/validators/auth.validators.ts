import type { RequestHandler } from "express";
import { ValidationError } from "../../../shared/errors/index.js";

const registerFields = new Set(["name", "email", "password"]);
const teacherAccountFields = new Set(["email", "password"]);

export const validateRegister: RequestHandler = (request, _response, next) => {
  if (!hasOnlyExpectedFields(request.body, registerFields)) {
    next(new ValidationError("Registration payload contains unsupported fields."));
    return;
  }

  if (!hasStringFields(request.body, ["name", "email", "password"])) {
    next(new ValidationError("Name, email, and password are required."));
    return;
  }

  next();
};

export const validateCreateTeacherAccount: RequestHandler = (request, _response, next) => {
  if (!hasOnlyExpectedFields(request.body, teacherAccountFields)) {
    next(new ValidationError("Teacher account payload contains unsupported fields."));
    return;
  }

  if (!hasStringFields(request.body, ["email", "password"])) {
    next(new ValidationError("Email and password are required."));
    return;
  }

  next();
};
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

function hasOnlyExpectedFields(body: unknown, allowedFields: Set<string>): body is Record<string, unknown> {
  return typeof body === "object" && body !== null && Object.keys(body).every((field) => allowedFields.has(field));
}

function hasStringFields(body: unknown, fields: readonly string[]): body is Record<string, string> {
  return typeof body === "object" && body !== null && fields.every((field) => typeof (body as Record<string, unknown>)[field] === "string");
}
