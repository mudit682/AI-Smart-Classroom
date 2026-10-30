import { isAxiosError } from "axios";
import { apiClient } from "../../lib/http/apiClient";

export interface Student {
  id: string;
  name: string;
  enrollmentNumber: string;
  department: string;
  semester: number;
  section: string;
  faceEnrolled: boolean;
}

export interface FaceEnrollment {
  id: string;
  student: {
    id: string;
  };
  enrollmentStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  imageCount: number;
}

interface StudentListResponse {
  students: Student[];
}

interface FaceEnrollmentListResponse {
  faceEnrollments: FaceEnrollment[];
}

export async function getTeacherStudents(): Promise<Student[]> {
  const response = await apiClient.get<StudentListResponse>("/students");

  return response.data.students;
}

export async function getTeacherFaceEnrollments(): Promise<FaceEnrollment[]> {
  const response = await apiClient.get<FaceEnrollmentListResponse>("/face-enrollments");

  return response.data.faceEnrollments;
}

export function getApiErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message;
  }

  return error instanceof Error ? error.message : "Student information could not be loaded.";
}
