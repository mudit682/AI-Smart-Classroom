import type { RequestHandler } from "express";
import { ValidationError } from "../../../shared/errors/index.js";
import { teacherStatuses } from "../models/teacher.model.js";

const requiredCreateFields = ["employeeId", "name", "email", "department", "designation"] as const;
const allowedUpdateFields = new Set<string>([...requiredCreateFields, "status"]);

export const validateCreateTeacher: RequestHandler = (request, _response, next) => {
  const body = request.body as Record<string, unknown>;
  const missingFields = requiredCreateFields.filter((field) => body[field] === undefined || body[field] === null);

  if (missingFields.length > 0) {
    next(new ValidationError("Missing required teacher fields.", { fields: missingFields }));
    return;
  }

  if (!hasValidTeacherShape(body, true)) {
    next(new ValidationError("Teacher payload is invalid."));
    return;
  }

  next();
};

export const validateUpdateTeacher: RequestHandler = (request, _response, next) => {
  const body = request.body as Record<string, unknown>;
  const fields = Object.keys(body);

  if (fields.length === 0) {
    next(new ValidationError("At least one teacher field is required for update."));
    return;
  }

  const unsupportedFields = fields.filter((field) => !allowedUpdateFields.has(field));

  if (unsupportedFields.length > 0) {
    next(new ValidationError("Unsupported teacher update fields.", { fields: unsupportedFields }));
    return;
  }

  if (!hasValidTeacherShape(body, false)) {
    next(new ValidationError("Teacher payload is invalid."));
    return;
  }

  next();
};

function hasValidTeacherShape(body: Record<string, unknown>, requireAllFields: boolean): boolean {
  return (
    isOptionalString(body.employeeId, requireAllFields) &&
    isOptionalString(body.name, requireAllFields) &&
    isOptionalString(body.email, requireAllFields) &&
    isOptionalString(body.department, requireAllFields) &&
    isOptionalString(body.designation, requireAllFields) &&
    isOptionalStatus(body.status)
  );
}

function isOptionalString(value: unknown, required: boolean): boolean {
  if (value === undefined) {
    return !required;
  }

  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalStatus(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }

  return typeof value === "string" && teacherStatuses.includes(value as (typeof teacherStatuses)[number]);
}

