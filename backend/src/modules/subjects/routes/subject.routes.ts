import { Router } from "express";
import { requireAuthentication } from "../../auth/middlewares/auth.middleware.js";
import { allowRoles } from "../../students/middlewares/student-access.middleware.js";
import { createSubject, deleteSubject, getSubjectById, listSubjects, updateSubject } from "../controllers/subject.controller.js";
import { validateCreateSubject, validateUpdateSubject } from "../validators/subject.validators.js";

export const subjectRouter = Router();

subjectRouter.use(requireAuthentication);

subjectRouter.get("/", allowRoles("admin", "teacher"), listSubjects);
subjectRouter.get("/:id", allowRoles("admin", "teacher"), getSubjectById);
subjectRouter.post("/", allowRoles("admin"), validateCreateSubject, createSubject);
subjectRouter.patch("/:id", allowRoles("admin"), validateUpdateSubject, updateSubject);
subjectRouter.delete("/:id", allowRoles("admin"), deleteSubject);

