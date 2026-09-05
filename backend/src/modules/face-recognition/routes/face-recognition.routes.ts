import { Router } from "express";
import { requireAuthentication } from "../../auth/middlewares/auth.middleware.js";
import { allowRoles } from "../../students/middlewares/student-access.middleware.js";
import { matchFace } from "../controllers/face-recognition.controller.js";
import { validateMatchFaceRecognition } from "../validators/face-recognition.validators.js";

export const faceRecognitionRouter = Router();

faceRecognitionRouter.use(requireAuthentication);

faceRecognitionRouter.post("/match", allowRoles("admin", "teacher"), validateMatchFaceRecognition, matchFace);
