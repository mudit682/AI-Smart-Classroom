import { Router } from "express";
import { attendanceSessionRouter } from "../modules/attendance-sessions/routes/attendance-session.routes.js";
import { authRouter } from "../modules/auth/routes/auth.routes.js";
import { classroomRouter } from "../modules/classrooms/routes/classroom.routes.js";
import { faceEnrollmentRouter } from "../modules/face-enrollments/routes/face-enrollment.routes.js";
import { healthRouter } from "../modules/health/health.routes.js";
import { lectureScheduleRouter } from "../modules/lecture-schedules/routes/lecture-schedule.routes.js";
import { studentEnrollmentRouter } from "../modules/student-enrollments/routes/student-enrollment.routes.js";
import { studentRouter } from "../modules/students/routes/student.routes.js";
import { subjectRouter } from "../modules/subjects/routes/subject.routes.js";
import { teacherAssignmentRouter } from "../modules/teacher-assignments/routes/teacher-assignment.routes.js";
import { teacherRouter } from "../modules/teachers/routes/teacher.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/attendance-sessions", attendanceSessionRouter);
apiRouter.use("/classrooms", classroomRouter);
apiRouter.use("/face-enrollments", faceEnrollmentRouter);
apiRouter.use("/health", healthRouter);
apiRouter.use("/lecture-schedules", lectureScheduleRouter);
apiRouter.use("/student-enrollments", studentEnrollmentRouter);
apiRouter.use("/students", studentRouter);
apiRouter.use("/subjects", subjectRouter);
apiRouter.use("/teacher-assignments", teacherAssignmentRouter);
apiRouter.use("/teachers", teacherRouter);
