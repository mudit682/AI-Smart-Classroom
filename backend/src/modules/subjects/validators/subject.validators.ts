import type { RequestHandler } from "express";
import { ValidationError } from "../../../shared/errors/index.js";
import { subjectStatuses } from "../models/subject.model.js";

const requiredCreateFields = ["subjectCode", "name", "department", "semester", "credits"] as const;
const allowedUpdateFields = new Set<string>([...requiredCreateFields, "status"]);

export const validateCreateSubject: RequestHandler = (request, _response, next) => {
  const body = request.body as Record<string, unknown>;
  const missingFields = requiredCreateFields.filter((field) => body[field] === undefined || body[field] === null);

  if (missingFields.length > 0) {
    next(new ValidationError("Missing required subject fields.", { fields: missingFields }));
    return;
  }

  if (!hasValidSubjectShape(body, true)) {
    next(new ValidationError("Subject payload is invalid."));
    return;
  }

  next();
};

export const validateUpdateSubject: RequestHandler = (request, _response, next) => {
  const body = request.body as Record<string, unknown>;
  const fields = Object.keys(body);

  if (fields.length === 0) {
    next(new ValidationError("At least one subject field is required for update."));
    return;
  }

  const unsupportedFields = fields.filter((field) => !allowedUpdateFields.has(field));

  if (unsupportedFields.length > 0) {
    next(new ValidationError("Unsupported subject update fields.", { fields: unsupportedFields }));
    return;
  }

  if (!hasValidSubjectShape(body, false)) {
    next(new ValidationError("Subject payload is invalid."));
    return;
  }

  next();
};

function hasValidSubjectShape(body: Record<string, unknown>, requireAllFields: boolean): boolean {
  return (
    isOptionalString(body.subjectCode, requireAllFields) &&
    isOptionalString(body.name, requireAllFields) &&
    isOptionalString(body.department, requireAllFields) &&
    isOptionalInteger(body.semester, requireAllFields) &&
    isOptionalInteger(body.credits, requireAllFields) &&
    isOptionalStatus(body.status)
  );
}

function isOptionalString(value: unknown, required: boolean): boolean {
  if (value === undefined) {
    return !required;
  }

  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalInteger(value: unknown, required: boolean): boolean {
  if (value === undefined) {
    return !required;
  }

  return typeof value === "number" && Number.isInteger(value);
}

function isOptionalStatus(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }

  return typeof value === "string" && subjectStatuses.includes(value as (typeof subjectStatuses)[number]);
}

