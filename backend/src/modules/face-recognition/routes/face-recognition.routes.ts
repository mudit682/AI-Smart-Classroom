import { Router } from "express";
import { requireAuthentication } from "../../auth/middlewares/auth.middleware.js";
import { allowRoles } from "../../students/middlewares/student-access.middleware.js";
import {
  matchFace,
  processClassroomRecognition,
  processRecognitionImage
} from "../controllers/face-recognition.controller.js";
import {
  uploadClassroomRecognitionImages,
  uploadFaceRecognitionImage
} from "../middlewares/face-recognition-upload.middleware.js";
import {
  validateClassroomRecognitionImages,
  validateMatchFaceRecognition,
  validateProcessFaceRecognitionImage
} from "../validators/face-recognition.validators.js";

export const faceRecognitionRouter = Router();

faceRecognitionRouter.use(requireAuthentication);

faceRecognitionRouter.post("/match", allowRoles("admin", "teacher"), validateMatchFaceRecognition, matchFace);
faceRecognitionRouter.post(
  "/process-image",
  allowRoles("admin", "teacher"),
  uploadFaceRecognitionImage,
  validateProcessFaceRecognitionImage,
  processRecognitionImage
);
faceRecognitionRouter.post(
  "/process-classroom",
  allowRoles("admin", "teacher"),
  uploadClassroomRecognitionImages,
  validateClassroomRecognitionImages,
  processClassroomRecognition
);
