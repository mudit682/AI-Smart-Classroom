import { Router } from "express";
import { requireAuthentication } from "../../auth/middlewares/auth.middleware.js";
import { allowRoles } from "../../students/middlewares/student-access.middleware.js";
import { createTeacher, deleteTeacher, getTeacherById, listTeachers, updateTeacher } from "../controllers/teacher.controller.js";
import { validateCreateTeacher, validateUpdateTeacher } from "../validators/teacher.validators.js";

export const teacherRouter = Router();

teacherRouter.use(requireAuthentication);

teacherRouter.get("/", allowRoles("admin", "teacher"), listTeachers);
teacherRouter.get("/:id", allowRoles("admin", "teacher"), getTeacherById);
teacherRouter.post("/", allowRoles("admin"), validateCreateTeacher, createTeacher);
teacherRouter.patch("/:id", allowRoles("admin"), validateUpdateTeacher, updateTeacher);
teacherRouter.delete("/:id", allowRoles("admin"), deleteTeacher);

