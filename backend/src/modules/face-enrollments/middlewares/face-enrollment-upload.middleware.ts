import type { RequestHandler } from "express";
import multer, { MulterError } from "multer";
import { env } from "../../../config/env.js";
import { ValidationError } from "../../../shared/errors/index.js";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/bmp"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.FACE_ENROLLMENT_MAX_FILE_SIZE_MB * 1024 * 1024,
    files: env.FACE_ENROLLMENT_MAX_UPLOADS
  },
  fileFilter: (_request, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new ValidationError("Unsupported image file type."));
      return;
    }

    callback(null, true);
  }
}).fields([
  { name: "files", maxCount: env.FACE_ENROLLMENT_MAX_UPLOADS },
  { name: "file", maxCount: env.FACE_ENROLLMENT_MAX_UPLOADS }
]);

export const uploadFaceEnrollmentImages: RequestHandler = (request, response, next) => {
  upload(request as any, response as any, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof MulterError) {
      next(new ValidationError("Face enrollment image upload is invalid.", { code: error.code }));
      return;
    }

    next(error);
  });
};
