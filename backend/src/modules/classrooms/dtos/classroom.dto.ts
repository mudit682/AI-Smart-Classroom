import type { ClassroomSection, ClassroomStatus } from "../models/classroom.model.js";

export interface CreateClassroomRequest {
  name: string;
  department: string;
  semester: number;
  section: ClassroomSection;
  academicYear: string;
  capacity: number;
  status?: ClassroomStatus;
}

export type UpdateClassroomRequest = Partial<CreateClassroomRequest>;

export interface ClassroomResponse {
  id: string;
  name: string;
  department: string;
  semester: number;
  section: ClassroomSection;
  academicYear: string;
  capacity: number;
  status: ClassroomStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClassroomListResponse {
  classrooms: ClassroomResponse[];
}

export interface DeleteClassroomResponse {
  message: string;
}

