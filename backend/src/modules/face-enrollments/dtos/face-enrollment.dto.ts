import type { FaceEnrollmentStatus } from "../models/face-enrollment.model.js";

export interface CreateFaceEnrollmentRequest {
  studentId: string;
  enrollmentStatus?: FaceEnrollmentStatus;
  faceImages?: string[];
  totalImages?: number;
  requiredImages?: number;
  embeddingGenerated?: boolean;
  embeddingVersion?: string;
  lastEnrolledAt?: string | null;
  notes?: string;
}

export type UpdateFaceEnrollmentRequest = Partial<CreateFaceEnrollmentRequest>;

export interface FaceEnrollmentStudentResponse {
  id: string;
  name: string;
  enrollmentNumber: string;
  email: string;
  department: string;
  semester: number;
  section: string;
  faceEnrolled: boolean;
}

export interface FaceEnrollmentResponse {
  id: string;
  student: FaceEnrollmentStudentResponse;
  enrollmentStatus: FaceEnrollmentStatus;
  imageCount: number;
  faceImages: string[];
  totalImages: number;
  requiredImages: number;
  embeddingGenerated: boolean;
  embeddingStatus: "GENERATED" | "NOT_GENERATED";
  embeddingVersion: string;
  lastEnrolledAt: string | null;
  notes?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FaceEnrollmentListResponse {
  faceEnrollments: FaceEnrollmentResponse[];
}

export interface DeleteFaceEnrollmentResponse {
  message: string;
}

export interface FaceEnrollmentActor {
  userId: string;
  email: string;
  role: "student" | "teacher" | "admin";
}

export interface FaceEnrollmentUploadResult {
  uploadedImages: string[];
  faceEnrollment: FaceEnrollmentResponse;
}
