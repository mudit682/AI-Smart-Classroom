import type { ClassroomSection, ClassroomStatus } from "../../classrooms/models/classroom.model.js";
import type { SubjectStatus } from "../../subjects/models/subject.model.js";
import type { TeacherStatus } from "../../teachers/models/teacher.model.js";
import type { TeacherAssignmentStatus } from "../models/teacher-assignment.model.js";

export interface CreateTeacherAssignmentRequest {
  teacherId: string;
  subjectId: string;
  classroomId: string;
  academicYear: string;
  status?: TeacherAssignmentStatus;
}

export type UpdateTeacherAssignmentRequest = Partial<CreateTeacherAssignmentRequest>;

export interface TeacherAssignmentTeacherResponse {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  status: TeacherStatus;
}

export interface TeacherAssignmentSubjectResponse {
  id: string;
  subjectCode: string;
  name: string;
  department: string;
  semester: number;
  credits: number;
  status: SubjectStatus;
}

export interface TeacherAssignmentClassroomResponse {
  id: string;
  name: string;
  department: string;
  semester: number;
  section: ClassroomSection;
  academicYear: string;
  capacity: number;
  status: ClassroomStatus;
}

export interface TeacherAssignmentResponse {
  id: string;
  teacher: TeacherAssignmentTeacherResponse;
  subject: TeacherAssignmentSubjectResponse;
  classroom: TeacherAssignmentClassroomResponse;
  academicYear: string;
  status: TeacherAssignmentStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherAssignmentListResponse {
  teacherAssignments: TeacherAssignmentResponse[];
}

export interface DeleteTeacherAssignmentResponse {
  message: string;
}

