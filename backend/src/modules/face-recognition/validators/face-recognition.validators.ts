import type { RequestHandler } from "express";
import { ValidationError } from "../../../shared/errors/index.js";
import type { ClassroomRecognitionView } from "../dtos/face-recognition.dto.js";

const classroomRecognitionViews: ClassroomRecognitionView[] = ["left", "center", "right"];

export const validateMatchFaceRecognition: RequestHandler = (request, _response, next) => {
  const body = request.body as Record<string, unknown>;

  if (!Array.isArray(body.embedding)) {
    next(new ValidationError("Embedding is required."));
    return;
  }

  next();
};

export const validateClassroomRecognitionImages: RequestHandler = (request, _response, next) => {
  const files = request.files as Partial<Record<ClassroomRecognitionView, Express.Multer.File[]>> | undefined;

  if (!files) {
    next(new ValidationError("Exactly three classroom images are required: left, center, and right."));
    return;
  }

  const hasAllViews = classroomRecognitionViews.every((view) => files[view]?.length === 1);
  const uploadedFileCount = classroomRecognitionViews.reduce((count, view) => count + (files[view]?.length ?? 0), 0);

  if (!hasAllViews || uploadedFileCount !== 3) {
    next(new ValidationError("Exactly three classroom images are required: left, center, and right."));
    return;
  }

  next();
};

export const validateAttendanceSessionRecognition: RequestHandler = (request, _response, next) => {
  const body = request.body as Record<string, unknown>;
  const attendanceSessionId = typeof body.attendanceSessionId === "string" ? body.attendanceSessionId.trim() : "";
  const lectureScheduleId = typeof body.lectureScheduleId === "string" ? body.lectureScheduleId.trim() : "";

  if ((!attendanceSessionId && !lectureScheduleId) || (attendanceSessionId && lectureScheduleId)) {
    next(new ValidationError("Provide exactly one of attendanceSessionId or lectureScheduleId."));
    return;
  }

  if (body.sessionDate !== undefined && (typeof body.sessionDate !== "string" || body.sessionDate.trim().length === 0)) {
    next(new ValidationError("Session date must be a valid date string."));
    return;
  }

  next();
};

export const validateProcessFaceRecognitionImage: RequestHandler = (request, _response, next) => {
  if (!request.file) {
    next(new ValidationError("Classroom image file is required."));
    return;
  }

  next();
};
