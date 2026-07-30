import type { RequestHandler } from "express";
import { ValidationError } from "../../../shared/errors/index.js";
import { classroomSections, classroomStatuses } from "../models/classroom.model.js";

const requiredCreateFields = ["name", "department", "semester", "section", "academicYear", "capacity"] as const;
const allowedUpdateFields = new Set<string>([...requiredCreateFields, "status"]);

export const validateCreateClassroom: RequestHandler = (request, _response, next) => {
  const body = request.body as Record<string, unknown>;
  const missingFields = requiredCreateFields.filter((field) => body[field] === undefined || body[field] === null);

  if (missingFields.length > 0) {
    next(new ValidationError("Missing required classroom fields.", { fields: missingFields }));
    return;
  }

  if (!hasValidClassroomShape(body, true)) {
    next(new ValidationError("Classroom payload is invalid."));
    return;
  }

  next();
};

export const validateUpdateClassroom: RequestHandler = (request, _response, next) => {
  const body = request.body as Record<string, unknown>;
  const fields = Object.keys(body);

  if (fields.length === 0) {
    next(new ValidationError("At least one classroom field is required for update."));
    return;
  }

  const unsupportedFields = fields.filter((field) => !allowedUpdateFields.has(field));

  if (unsupportedFields.length > 0) {
    next(new ValidationError("Unsupported classroom update fields.", { fields: unsupportedFields }));
    return;
  }

  if (!hasValidClassroomShape(body, false)) {
    next(new ValidationError("Classroom payload is invalid."));
    return;
  }

  next();
};

function hasValidClassroomShape(body: Record<string, unknown>, requireAllFields: boolean): boolean {
  return (
    isOptionalString(body.name, requireAllFields) &&
    isOptionalString(body.department, requireAllFields) &&
    isOptionalInteger(body.semester, requireAllFields) &&
    isOptionalSection(body.section, requireAllFields) &&
    isOptionalString(body.academicYear, requireAllFields) &&
    isOptionalInteger(body.capacity, requireAllFields) &&
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

function isOptionalSection(value: unknown, required: boolean): boolean {
  if (value === undefined) {
    return !required;
  }

  return typeof value === "string" && classroomSections.includes(value.toUpperCase() as (typeof classroomSections)[number]);
}

function isOptionalStatus(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }

  return typeof value === "string" && classroomStatuses.includes(value as (typeof classroomStatuses)[number]);
}

