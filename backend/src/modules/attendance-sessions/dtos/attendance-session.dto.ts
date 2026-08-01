import type { ClassroomSection, ClassroomStatus } from "../../classrooms/models/classroom.model.js";
import type { LectureScheduleDay, LectureScheduleStatus } from "../../lecture-schedules/models/lecture-schedule.model.js";
import type { SubjectStatus } from "../../subjects/models/subject.model.js";
import type { TeacherAssignmentStatus } from "../../teacher-assignments/models/teacher-assignment.model.js";
import type { TeacherStatus } from "../../teachers/models/teacher.model.js";
import type {
  AttendanceRecognitionStatus,
  AttendanceSessionStatus
} from "../models/attendance-session.model.js";

export interface StartAttendanceSessionRequest {
  lectureScheduleId: string;
  sessionDate?: string;
  recognitionStatus?: AttendanceRecognitionStatus;
  capturedImages?: string[];
}

export interface AttendanceSessionTeacherResponse {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  status: TeacherStatus;
}

export interface AttendanceSessionSubjectResponse {
  id: string;
  subjectCode: string;
  name: string;
  department: string;
  semester: number;
  credits: number;
  status: SubjectStatus;
}

export interface AttendanceSessionClassroomResponse {
  id: string;
  name: string;
  department: string;
  semester: number;
  section: ClassroomSection;
  academicYear: string;
  capacity: number;
  status: ClassroomStatus;
}

export interface AttendanceSessionTeacherAssignmentResponse {
  id: string;
  academicYear: string;
  status: TeacherAssignmentStatus;
}

export interface AttendanceSessionLectureScheduleResponse {
  id: string;
  academicYear: string;
  semester: string;
  dayOfWeek: LectureScheduleDay;
  startTime: string;
  endTime: string;
  status: LectureScheduleStatus;
}

export interface AttendanceSessionResponse {
  id: string;
  lectureSchedule: AttendanceSessionLectureScheduleResponse;
  teacherAssignment: AttendanceSessionTeacherAssignmentResponse;
  classroom: AttendanceSessionClassroomResponse;
  teacher: AttendanceSessionTeacherResponse;
  subject: AttendanceSessionSubjectResponse;
  sessionDate: string;
  startedAt: string;
  endedAt: string | null;
  captureCount: number;
  maxCaptures: number;
  totalStudents: number;
  recognizedStudents: number;
  absentStudents: number;
  recognitionStatus: AttendanceRecognitionStatus;
  capturedImages: string[];
  status: AttendanceSessionStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceSessionListResponse {
  attendanceSessions: AttendanceSessionResponse[];
}
