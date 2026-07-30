import { Router } from "express";
import { authRouter } from "../modules/auth/routes/auth.routes.js";
import { classroomRouter } from "../modules/classrooms/routes/classroom.routes.js";
import { healthRouter } from "../modules/health/health.routes.js";
import { studentRouter } from "../modules/students/routes/student.routes.js";
import { subjectRouter } from "../modules/subjects/routes/subject.routes.js";
import { teacherRouter } from "../modules/teachers/routes/teacher.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/classrooms", classroomRouter);
apiRouter.use("/health", healthRouter);
apiRouter.use("/students", studentRouter);
apiRouter.use("/subjects", subjectRouter);
apiRouter.use("/teachers", teacherRouter);
