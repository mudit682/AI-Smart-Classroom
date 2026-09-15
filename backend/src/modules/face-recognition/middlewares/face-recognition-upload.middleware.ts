import type { RequestHandler } from "express";
import multer, { MulterError } from "multer";
import { env } from "../../../config/env.js";
import { ValidationError } from "../../../shared/errors/index.js";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/bmp"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.FACE_ENROLLMENT_MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 1
  },
  fileFilter: (_request, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new ValidationError("Unsupported image file type."));
      return;
    }

    callback(null, true);
  }
}).single("file");

const uploadThreeImages = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.FACE_ENROLLMENT_MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 3
  },
  fileFilter: (_request, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new ValidationError("Unsupported image file type."));
      return;
    }

    callback(null, true);
  }
}).fields([
  { name: "left", maxCount: 1 },
  { name: "center", maxCount: 1 },
  { name: "right", maxCount: 1 }
]);

export const uploadFaceRecognitionImage: RequestHandler = (request, response, next) => {
  upload(request as any, response as any, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof MulterError) {
      next(new ValidationError("Face recognition image upload is invalid.", { code: error.code }));
      return;
    }

    next(error);
  });
};

export const uploadClassroomRecognitionImages: RequestHandler = (request, response, next) => {
  uploadThreeImages(request as any, response as any, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof MulterError) {
      next(new ValidationError("Classroom recognition image upload is invalid.", { code: error.code }));
      return;
    }

    next(error);
  });
};
