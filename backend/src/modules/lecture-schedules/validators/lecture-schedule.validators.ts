import type { RequestHandler } from "express";
import { ValidationError } from "../../../shared/errors/index.js";
import { lectureScheduleDays, lectureScheduleStatuses } from "../models/lecture-schedule.model.js";

const requiredCreateFields = [
  "teacherAssignmentId",
  "classroomId",
  "subjectId",
  "teacherId",
  "academicYear",
  "semester",
  "dayOfWeek",
  "startTime",
  "endTime"
] as const;
const allowedUpdateFields = new Set<string>([...requiredCreateFields, "status"]);

export const validateCreateLectureSchedule: RequestHandler = (request, _response, next) => {
  const body = request.body as Record<string, unknown>;
  const missingFields = requiredCreateFields.filter((field) => body[field] === undefined || body[field] === null);

  if (missingFields.length > 0) {
    next(new ValidationError("Missing required lecture schedule fields.", { fields: missingFields }));
    return;
  }

  if (!hasValidLectureScheduleShape(body, true)) {
    next(new ValidationError("Lecture schedule payload is invalid."));
    return;
  }

  next();
};

export const validateUpdateLectureSchedule: RequestHandler = (request, _response, next) => {
  const body = request.body as Record<string, unknown>;
  const fields = Object.keys(body);

  if (fields.length === 0) {
    next(new ValidationError("At least one lecture schedule field is required for update."));
    return;
  }

  const unsupportedFields = fields.filter((field) => !allowedUpdateFields.has(field));

  if (unsupportedFields.length > 0) {
    next(new ValidationError("Unsupported lecture schedule update fields.", { fields: unsupportedFields }));
    return;
  }

  if (!hasValidLectureScheduleShape(body, false)) {
    next(new ValidationError("Lecture schedule payload is invalid."));
    return;
  }

  next();
};

function hasValidLectureScheduleShape(body: Record<string, unknown>, requireAllFields: boolean): boolean {
  return (
    isOptionalString(body.teacherAssignmentId, requireAllFields) &&
    isOptionalString(body.classroomId, requireAllFields) &&
    isOptionalString(body.subjectId, requireAllFields) &&
    isOptionalString(body.teacherId, requireAllFields) &&
    isOptionalString(body.academicYear, requireAllFields) &&
    isOptionalString(body.semester, requireAllFields) &&
    isOptionalDay(body.dayOfWeek, requireAllFields) &&
    isOptionalString(body.startTime, requireAllFields) &&
    isOptionalString(body.endTime, requireAllFields) &&
    isOptionalStatus(body.status)
  );
}

function isOptionalString(value: unknown, required: boolean): boolean {
  if (value === undefined) {
    return !required;
  }

  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalDay(value: unknown, required: boolean): boolean {
  if (value === undefined) {
    return !required;
  }

  return typeof value === "string" && lectureScheduleDays.includes(value as (typeof lectureScheduleDays)[number]);
}

function isOptionalStatus(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }

  return typeof value === "string" && lectureScheduleStatuses.includes(value as (typeof lectureScheduleStatuses)[number]);
}

