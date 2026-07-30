import { Router } from "express";
import { requireAuthentication } from "../../auth/middlewares/auth.middleware.js";
import { createStudent, deleteStudent, getStudentById, listStudents, updateStudent } from "../controllers/student.controller.js";
import { allowRoles } from "../middlewares/student-access.middleware.js";
import { validateCreateStudent, validateUpdateStudent } from "../validators/student.validators.js";

export const studentRouter = Router();

studentRouter.use(requireAuthentication);

studentRouter.get("/", allowRoles("admin", "teacher"), listStudents);
studentRouter.get("/:id", allowRoles("admin", "teacher"), getStudentById);
studentRouter.post("/", allowRoles("admin"), validateCreateStudent, createStudent);
studentRouter.patch("/:id", allowRoles("admin"), validateUpdateStudent, updateStudent);
studentRouter.delete("/:id", allowRoles("admin"), deleteStudent);

