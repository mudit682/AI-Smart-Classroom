import type { TeacherStatus } from "../models/teacher.model.js";

export interface CreateTeacherRequest {
  employeeId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  status?: TeacherStatus;
}

export type UpdateTeacherRequest = Partial<CreateTeacherRequest>;

export interface TeacherResponse {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  status: TeacherStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherListResponse {
  teachers: TeacherResponse[];
}

export interface DeleteTeacherResponse {
  message: string;
}

