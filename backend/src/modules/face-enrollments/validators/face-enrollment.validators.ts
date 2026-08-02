import type { RequestHandler } from "express";
import { ValidationError } from "../../../shared/errors/index.js";
import { faceEnrollmentStatuses } from "../models/face-enrollment.model.js";

const requiredCreateFields = ["studentId"] as const;
const allowedUpdateFields = new Set<string>([
  "studentId",
  "enrollmentStatus",
  "faceImages",
  "totalImages",
  "requiredImages",
  "embeddingGenerated",
  "embeddingVersion",
  "lastEnrolledAt",
  "notes"
]);

export const validateCreateFaceEnrollment: RequestHandler = (request, _response, next) => {
  const body = request.body as Record<string, unknown>;
  const missingFields = requiredCreateFields.filter((field) => body[field] === undefined || body[field] === null);

  if (missingFields.length > 0) {
    next(new ValidationError("Missing required face enrollment fields.", { fields: missingFields }));
    return;
  }

  if (!hasValidFaceEnrollmentShape(body, true)) {
    next(new ValidationError("Face enrollment payload is invalid."));
    return;
  }

  next();
};

export const validateUpdateFaceEnrollment: RequestHandler = (request, _response, next) => {
  const body = request.body as Record<string, unknown>;
  const fields = Object.keys(body);

  if (fields.length === 0) {
    next(new ValidationError("At least one face enrollment field is required for update."));
    return;
  }

  const unsupportedFields = fields.filter((field) => !allowedUpdateFields.has(field));

  if (unsupportedFields.length > 0) {
    next(new ValidationError("Unsupported face enrollment update fields.", { fields: unsupportedFields }));
    return;
  }

  if (!hasValidFaceEnrollmentShape(body, false)) {
    next(new ValidationError("Face enrollment payload is invalid."));
    return;
  }

  next();
};

function hasValidFaceEnrollmentShape(body: Record<string, unknown>, requireAllFields: boolean): boolean {
  return (
    isOptionalString(body.studentId, requireAllFields) &&
    isOptionalEnrollmentStatus(body.enrollmentStatus) &&
    isOptionalStringArray(body.faceImages) &&
    isOptionalNonNegativeInteger(body.totalImages) &&
    isOptionalPositiveInteger(body.requiredImages) &&
    isOptionalBoolean(body.embeddingGenerated) &&
    isOptionalString(body.embeddingVersion, false) &&
    isOptionalNullableString(body.lastEnrolledAt) &&
    isOptionalString(body.notes, false)
  );
}

function isOptionalString(value: unknown, required: boolean): boolean {
  if (value === undefined) {
    return !required;
  }

  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalNullableString(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }

  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalEnrollmentStatus(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }

  return typeof value === "string" && faceEnrollmentStatuses.includes(value as (typeof faceEnrollmentStatuses)[number]);
}

function isOptionalStringArray(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }

  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim().length > 0);
}

function isOptionalNonNegativeInteger(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }

  return Number.isInteger(value) && (value as number) >= 0;
}

function isOptionalPositiveInteger(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }

  return Number.isInteger(value) && (value as number) > 0;
}

function isOptionalBoolean(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }

  return typeof value === "boolean";
}
