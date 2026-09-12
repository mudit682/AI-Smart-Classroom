import type { RequestHandler } from "express";
import { ValidationError } from "../../../shared/errors/index.js";

export const validateMatchFaceRecognition: RequestHandler = (request, _response, next) => {
  const body = request.body as Record<string, unknown>;

  if (!Array.isArray(body.embedding)) {
    next(new ValidationError("Embedding is required."));
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
