import { Router } from "express";
import { requireAuthentication } from "../../auth/middlewares/auth.middleware.js";
import { allowRoles } from "../../students/middlewares/student-access.middleware.js";
import {
  createStudentEnrollment,
  deleteStudentEnrollment,
  getStudentEnrollmentById,
  listStudentEnrollments,
  updateStudentEnrollment
} from "../controllers/student-enrollment.controller.js";
import {
  validateCreateStudentEnrollment,
  validateUpdateStudentEnrollment
} from "../validators/student-enrollment.validators.js";

export const studentEnrollmentRouter = Router();

studentEnrollmentRouter.use(requireAuthentication);

studentEnrollmentRouter.get("/", allowRoles("admin", "teacher"), listStudentEnrollments);
studentEnrollmentRouter.get("/:id", allowRoles("admin", "teacher"), getStudentEnrollmentById);
studentEnrollmentRouter.post("/", allowRoles("admin"), validateCreateStudentEnrollment, createStudentEnrollment);
studentEnrollmentRouter.patch("/:id", allowRoles("admin"), validateUpdateStudentEnrollment, updateStudentEnrollment);
studentEnrollmentRouter.delete("/:id", allowRoles("admin"), deleteStudentEnrollment);

