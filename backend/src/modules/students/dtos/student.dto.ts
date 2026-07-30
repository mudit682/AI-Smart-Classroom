export interface CreateStudentRequest {
  name: string;
  enrollmentNumber: string;
  email: string;
  department: string;
  semester: number;
  section: string;
}

export type UpdateStudentRequest = Partial<CreateStudentRequest>;

export interface StudentResponse {
  id: string;
  name: string;
  enrollmentNumber: string;
  email: string;
  department: string;
  semester: number;
  section: string;
  faceEnrolled: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentListResponse {
  students: StudentResponse[];
}

