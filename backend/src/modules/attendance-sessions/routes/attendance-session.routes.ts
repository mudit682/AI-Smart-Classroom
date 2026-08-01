import { Router } from "express";
import { requireAuthentication } from "../../auth/middlewares/auth.middleware.js";
import { allowRoles } from "../../students/middlewares/student-access.middleware.js";
import {
  cancelAttendanceSession,
  endAttendanceSession,
  getAttendanceSessionById,
  listAttendanceSessions,
  startAttendanceSession
} from "../controllers/attendance-session.controller.js";
import { validateStartAttendanceSession } from "../validators/attendance-session.validators.js";

export const attendanceSessionRouter = Router();

attendanceSessionRouter.use(requireAuthentication);

attendanceSessionRouter.post("/start", allowRoles("teacher"), validateStartAttendanceSession, startAttendanceSession);
attendanceSessionRouter.post("/:id/end", allowRoles("teacher"), endAttendanceSession);
attendanceSessionRouter.patch("/:id/cancel", allowRoles("teacher"), cancelAttendanceSession);
attendanceSessionRouter.get("/", allowRoles("admin", "teacher"), listAttendanceSessions);
attendanceSessionRouter.get("/:id", allowRoles("admin", "teacher"), getAttendanceSessionById);

