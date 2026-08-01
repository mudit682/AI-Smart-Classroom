import type { RequestHandler } from "express";
import { ValidationError } from "../../../shared/errors/index.js";
import { attendanceRecognitionStatuses } from "../models/attendance-session.model.js";

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

  const recognitionStatus = body.recognitionStatus;

  if (
    recognitionStatus !== undefined &&
    (typeof recognitionStatus !== "string" || !attendanceRecognitionStatuses.some((status) => status === recognitionStatus))
  ) {
    next(new ValidationError("Recognition status must be a valid attendance recognition status."));
    return;
  }

  if (
    body.capturedImages !== undefined &&
    (!Array.isArray(body.capturedImages) || body.capturedImages.some((image) => typeof image !== "string"))
  ) {
    next(new ValidationError("Captured images must be an array of strings."));
    return;
  }

  next();
};
