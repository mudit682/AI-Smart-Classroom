import type { ClassroomSection, ClassroomStatus } from "../../classrooms/models/classroom.model.js";
import type { StudentEnrollmentStatus } from "../models/student-enrollment.model.js";

export interface CreateStudentEnrollmentRequest {
  studentId: string;
  classroomId: string;
  academicYear: string;
  rollNumber: string;
  status?: StudentEnrollmentStatus;
}

export type UpdateStudentEnrollmentRequest = Partial<CreateStudentEnrollmentRequest>;

export interface StudentEnrollmentStudentResponse {
  id: string;
  name: string;
  enrollmentNumber: string;
  email: string;
  department: string;
  semester: number;
  section: string;
  faceEnrolled: boolean;
}

export interface StudentEnrollmentClassroomResponse {
  id: string;
  name: string;
  department: string;
  semester: number;
  section: ClassroomSection;
  academicYear: string;
  capacity: number;
  status: ClassroomStatus;
}

export interface StudentEnrollmentResponse {
  id: string;
  student: StudentEnrollmentStudentResponse;
  classroom: StudentEnrollmentClassroomResponse;
  academicYear: string;
  rollNumber: string;
  status: StudentEnrollmentStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentEnrollmentListResponse {
  studentEnrollments: StudentEnrollmentResponse[];
}

export interface DeleteStudentEnrollmentResponse {
  message: string;
}

