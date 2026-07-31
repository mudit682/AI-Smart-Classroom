import type { RequestHandler } from "express";
import { ValidationError } from "../../../shared/errors/index.js";
import { teacherAssignmentStatuses } from "../models/teacher-assignment.model.js";

const requiredCreateFields = ["teacherId", "subjectId", "classroomId", "academicYear"] as const;
const allowedUpdateFields = new Set<string>([...requiredCreateFields, "status"]);

export const validateCreateTeacherAssignment: RequestHandler = (request, _response, next) => {
  const body = request.body as Record<string, unknown>;
  const missingFields = requiredCreateFields.filter((field) => body[field] === undefined || body[field] === null);

  if (missingFields.length > 0) {
    next(new ValidationError("Missing required teacher assignment fields.", { fields: missingFields }));
    return;
  }

  if (!hasValidTeacherAssignmentShape(body, true)) {
    next(new ValidationError("Teacher assignment payload is invalid."));
    return;
  }

  next();
};

export const validateUpdateTeacherAssignment: RequestHandler = (request, _response, next) => {
  const body = request.body as Record<string, unknown>;
  const fields = Object.keys(body);

  if (fields.length === 0) {
    next(new ValidationError("At least one teacher assignment field is required for update."));
    return;
  }

  const unsupportedFields = fields.filter((field) => !allowedUpdateFields.has(field));

  if (unsupportedFields.length > 0) {
    next(new ValidationError("Unsupported teacher assignment update fields.", { fields: unsupportedFields }));
    return;
  }

  if (!hasValidTeacherAssignmentShape(body, false)) {
    next(new ValidationError("Teacher assignment payload is invalid."));
    return;
  }

  next();
};

function hasValidTeacherAssignmentShape(body: Record<string, unknown>, requireAllFields: boolean): boolean {
  return (
    isOptionalString(body.teacherId, requireAllFields) &&
    isOptionalString(body.subjectId, requireAllFields) &&
    isOptionalString(body.classroomId, requireAllFields) &&
    isOptionalString(body.academicYear, requireAllFields) &&
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

  return typeof value === "string" && teacherAssignmentStatuses.includes(value as (typeof teacherAssignmentStatuses)[number]);
}

