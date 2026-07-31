import { Router } from "express";
import { requireAuthentication } from "../../auth/middlewares/auth.middleware.js";
import { allowRoles } from "../../students/middlewares/student-access.middleware.js";
import {
  createTeacherAssignment,
  deleteTeacherAssignment,
  getTeacherAssignmentById,
  listTeacherAssignments,
  updateTeacherAssignment
} from "../controllers/teacher-assignment.controller.js";
import {
  validateCreateTeacherAssignment,
  validateUpdateTeacherAssignment
} from "../validators/teacher-assignment.validators.js";

export const teacherAssignmentRouter = Router();

teacherAssignmentRouter.use(requireAuthentication);

teacherAssignmentRouter.get("/", allowRoles("admin", "teacher"), listTeacherAssignments);
teacherAssignmentRouter.get("/:id", allowRoles("admin", "teacher"), getTeacherAssignmentById);
teacherAssignmentRouter.post("/", allowRoles("admin"), validateCreateTeacherAssignment, createTeacherAssignment);
teacherAssignmentRouter.patch("/:id", allowRoles("admin"), validateUpdateTeacherAssignment, updateTeacherAssignment);
teacherAssignmentRouter.delete("/:id", allowRoles("admin"), deleteTeacherAssignment);

