import { Router } from "express";
import { requireAuthentication } from "../../auth/middlewares/auth.middleware.js";
import { allowRoles } from "../../students/middlewares/student-access.middleware.js";
import { matchFace, processRecognitionImage } from "../controllers/face-recognition.controller.js";
import { uploadFaceRecognitionImage } from "../middlewares/face-recognition-upload.middleware.js";
import {
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
