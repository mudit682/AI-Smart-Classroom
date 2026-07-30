import { Router } from "express";
import { requireAuthentication } from "../../auth/middlewares/auth.middleware.js";
import { allowRoles } from "../../students/middlewares/student-access.middleware.js";
import {
  createClassroom,
  deleteClassroom,
  getClassroomById,
  listClassrooms,
  updateClassroom
} from "../controllers/classroom.controller.js";
import { validateCreateClassroom, validateUpdateClassroom } from "../validators/classroom.validators.js";

export const classroomRouter = Router();

classroomRouter.use(requireAuthentication);

classroomRouter.get("/", allowRoles("admin", "teacher"), listClassrooms);
classroomRouter.get("/:id", allowRoles("admin", "teacher"), getClassroomById);
classroomRouter.post("/", allowRoles("admin"), validateCreateClassroom, createClassroom);
classroomRouter.patch("/:id", allowRoles("admin"), validateUpdateClassroom, updateClassroom);
classroomRouter.delete("/:id", allowRoles("admin"), deleteClassroom);

