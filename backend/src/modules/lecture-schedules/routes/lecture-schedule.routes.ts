import { Router } from "express";
import { requireAuthentication } from "../../auth/middlewares/auth.middleware.js";
import { allowRoles } from "../../students/middlewares/student-access.middleware.js";
import {
  createLectureSchedule,
  deleteLectureSchedule,
  getLectureScheduleById,
  listLectureSchedules,
  updateLectureSchedule
} from "../controllers/lecture-schedule.controller.js";
import { validateCreateLectureSchedule, validateUpdateLectureSchedule } from "../validators/lecture-schedule.validators.js";

export const lectureScheduleRouter = Router();

lectureScheduleRouter.use(requireAuthentication);

lectureScheduleRouter.get("/", allowRoles("admin", "teacher"), listLectureSchedules);
lectureScheduleRouter.get("/:id", allowRoles("admin", "teacher"), getLectureScheduleById);
lectureScheduleRouter.post("/", allowRoles("admin"), validateCreateLectureSchedule, createLectureSchedule);
lectureScheduleRouter.patch("/:id", allowRoles("admin"), validateUpdateLectureSchedule, updateLectureSchedule);
lectureScheduleRouter.delete("/:id", allowRoles("admin"), deleteLectureSchedule);

