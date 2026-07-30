import type { RequestHandler } from "express";
import { ValidationError } from "../../../shared/errors/index.js";

const requiredCreateFields = ["name", "enrollmentNumber", "email", "department", "semester", "section"] as const;
const allowedUpdateFields = new Set<string>(requiredCreateFields);

export const validateCreateStudent: RequestHandler = (request, _response, next) => {
  const body = request.body as Record<string, unknown>;
  const missingFields = requiredCreateFields.filter((field) => body[field] === undefined || body[field] === null);

  if (missingFields.length > 0) {
    next(new ValidationError("Missing required student fields.", { fields: missingFields }));
    return;
  }

  if (!hasValidStudentShape(body, true)) {
    next(new ValidationError("Student payload is invalid."));
    return;
  }

  next();
};

export const validateUpdateStudent: RequestHandler = (request, _response, next) => {
  const body = request.body as Record<string, unknown>;
  const fields = Object.keys(body);

  if (fields.length === 0) {
    next(new ValidationError("At least one student field is required for update."));
    return;
  }

  const unsupportedFields = fields.filter((field) => !allowedUpdateFields.has(field));

  if (unsupportedFields.length > 0) {
    next(new ValidationError("Unsupported student update fields.", { fields: unsupportedFields }));
    return;
  }

  if (!hasValidStudentShape(body, false)) {
    next(new ValidationError("Student payload is invalid."));
    return;
  }

  next();
};

function hasValidStudentShape(body: Record<string, unknown>, requireAllFields: boolean): boolean {
  return (
    isOptionalString(body.name, requireAllFields) &&
    isOptionalString(body.enrollmentNumber, requireAllFields) &&
    isOptionalString(body.email, requireAllFields) &&
    isOptionalString(body.department, requireAllFields) &&
    isOptionalString(body.section, requireAllFields) &&
    isOptionalNumber(body.semester, requireAllFields)
  );
}

function isOptionalString(value: unknown, required: boolean): boolean {
  if (value === undefined) {
    return !required;
  }

  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalNumber(value: unknown, required: boolean): boolean {
  if (value === undefined) {
    return !required;
  }

  return typeof value === "number" && Number.isInteger(value);
}

