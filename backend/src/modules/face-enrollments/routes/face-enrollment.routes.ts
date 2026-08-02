import { Router } from "express";
import { requireAuthentication } from "../../auth/middlewares/auth.middleware.js";
import { allowRoles } from "../../students/middlewares/student-access.middleware.js";
import {
  createFaceEnrollment,
  deleteFaceEnrollment,
  getFaceEnrollmentById,
  listFaceEnrollments,
  updateFaceEnrollment
} from "../controllers/face-enrollment.controller.js";
import {
  validateCreateFaceEnrollment,
  validateUpdateFaceEnrollment
} from "../validators/face-enrollment.validators.js";

export const faceEnrollmentRouter = Router();

faceEnrollmentRouter.use(requireAuthentication);

faceEnrollmentRouter.get("/", allowRoles("admin", "teacher", "student"), listFaceEnrollments);
faceEnrollmentRouter.get("/:id", allowRoles("admin", "teacher", "student"), getFaceEnrollmentById);
faceEnrollmentRouter.post("/", allowRoles("admin"), validateCreateFaceEnrollment, createFaceEnrollment);
faceEnrollmentRouter.patch("/:id", allowRoles("admin"), validateUpdateFaceEnrollment, updateFaceEnrollment);
faceEnrollmentRouter.delete("/:id", allowRoles("admin"), deleteFaceEnrollment);
