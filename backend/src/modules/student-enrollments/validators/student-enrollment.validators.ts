import type { RequestHandler } from "express";
import { ValidationError } from "../../../shared/errors/index.js";
import { studentEnrollmentStatuses } from "../models/student-enrollment.model.js";

const requiredCreateFields = ["studentId", "classroomId", "academicYear", "rollNumber"] as const;
const allowedUpdateFields = new Set<string>([...requiredCreateFields, "status"]);

export const validateCreateStudentEnrollment: RequestHandler = (request, _response, next) => {
  const body = request.body as Record<string, unknown>;
  const missingFields = requiredCreateFields.filter((field) => body[field] === undefined || body[field] === null);

  if (missingFields.length > 0) {
    next(new ValidationError("Missing required student enrollment fields.", { fields: missingFields }));
    return;
  }

  if (!hasValidStudentEnrollmentShape(body, true)) {
    next(new ValidationError("Student enrollment payload is invalid."));
    return;
  }

  next();
};

export const validateUpdateStudentEnrollment: RequestHandler = (request, _response, next) => {
  const body = request.body as Record<string, unknown>;
  const fields = Object.keys(body);

  if (fields.length === 0) {
    next(new ValidationError("At least one student enrollment field is required for update."));
    return;
  }

  const unsupportedFields = fields.filter((field) => !allowedUpdateFields.has(field));

  if (unsupportedFields.length > 0) {
    next(new ValidationError("Unsupported student enrollment update fields.", { fields: unsupportedFields }));
    return;
  }

  if (!hasValidStudentEnrollmentShape(body, false)) {
    next(new ValidationError("Student enrollment payload is invalid."));
    return;
  }

  next();
};

function hasValidStudentEnrollmentShape(body: Record<string, unknown>, requireAllFields: boolean): boolean {
  return (
    isOptionalString(body.studentId, requireAllFields) &&
    isOptionalString(body.classroomId, requireAllFields) &&
    isOptionalString(body.academicYear, requireAllFields) &&
    isOptionalString(body.rollNumber, requireAllFields) &&
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

  return typeof value === "string" && studentEnrollmentStatuses.includes(value as (typeof studentEnrollmentStatuses)[number]);
}

