import type { ClassroomSection, ClassroomStatus } from "../../classrooms/models/classroom.model.js";
import type { SubjectStatus } from "../../subjects/models/subject.model.js";
import type { TeacherAssignmentStatus } from "../../teacher-assignments/models/teacher-assignment.model.js";
import type { TeacherStatus } from "../../teachers/models/teacher.model.js";
import type { LectureScheduleDay, LectureScheduleStatus } from "../models/lecture-schedule.model.js";

export interface CreateLectureScheduleRequest {
  teacherAssignmentId: string;
  classroomId: string;
  subjectId: string;
  teacherId: string;
  academicYear: string;
  semester: string;
  dayOfWeek: LectureScheduleDay;
  startTime: string;
  endTime: string;
  status?: LectureScheduleStatus;
}

export type UpdateLectureScheduleRequest = Partial<CreateLectureScheduleRequest>;

export interface LectureScheduleTeacherResponse {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  status: TeacherStatus;
}

export interface LectureScheduleSubjectResponse {
  id: string;
  subjectCode: string;
  name: string;
  department: string;
  semester: number;
  credits: number;
  status: SubjectStatus;
}

export interface LectureScheduleClassroomResponse {
  id: string;
  name: string;
  department: string;
  semester: number;
  section: ClassroomSection;
  academicYear: string;
  capacity: number;
  status: ClassroomStatus;
}

export interface LectureScheduleTeacherAssignmentResponse {
  id: string;
  academicYear: string;
  status: TeacherAssignmentStatus;
}

export interface LectureScheduleResponse {
  id: string;
  teacherAssignment: LectureScheduleTeacherAssignmentResponse;
  classroom: LectureScheduleClassroomResponse;
  subject: LectureScheduleSubjectResponse;
  teacher: LectureScheduleTeacherResponse;
  academicYear: string;
  semester: string;
  dayOfWeek: LectureScheduleDay;
  startTime: string;
  endTime: string;
  status: LectureScheduleStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface LectureScheduleListResponse {
  lectureSchedules: LectureScheduleResponse[];
}

export interface DeleteLectureScheduleResponse {
  message: string;
}

