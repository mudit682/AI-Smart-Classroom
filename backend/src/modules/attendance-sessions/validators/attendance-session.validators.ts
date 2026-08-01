import type { RequestHandler } from "express";
import { ValidationError } from "../../../shared/errors/index.js";

export const validateStartAttendanceSession: RequestHandler = (request, _response, next) => {
  const body = request.body as Record<string, unknown>;

  if (typeof body.lectureScheduleId !== "string" || body.lectureScheduleId.trim().length === 0) {
    next(new ValidationError("Lecture schedule id is required."));
    return;
  }

  if (body.sessionDate !== undefined && (typeof body.sessionDate !== "string" || body.sessionDate.trim().length === 0)) {
    next(new ValidationError("Session date must be a valid date string."));
    return;
  }

  next();
};

