import type { SubjectStatus } from "../models/subject.model.js";

export interface CreateSubjectRequest {
  subjectCode: string;
  name: string;
  department: string;
  semester: number;
  credits: number;
  status?: SubjectStatus;
}

export type UpdateSubjectRequest = Partial<CreateSubjectRequest>;

export interface SubjectResponse {
  id: string;
  subjectCode: string;
  name: string;
  department: string;
  semester: number;
  credits: number;
  status: SubjectStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectListResponse {
  subjects: SubjectResponse[];
}

export interface DeleteSubjectResponse {
  message: string;
}

