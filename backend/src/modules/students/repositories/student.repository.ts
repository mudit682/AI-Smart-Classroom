import type { Types } from "mongoose";
import { StudentModel, type Student, type StudentDocument } from "../models/student.model.js";

export interface CreateStudentRecord {
  name: string;
  enrollmentNumber: string;
  email: string;
  department: string;
  semester: number;
  section: string;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
}

export type UpdateStudentRecord = Partial<
  Pick<Student, "name" | "enrollmentNumber" | "email" | "department" | "semester" | "section">
> & {
  updatedBy: Types.ObjectId;
};

export class StudentRepository {
  async create(student: CreateStudentRecord): Promise<StudentDocument> {
    return StudentModel.create(student);
  }

  async findAll(): Promise<StudentDocument[]> {
    return StudentModel.find().sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<StudentDocument | null> {
    return StudentModel.findById(id).exec();
  }

  async findByEnrollmentNumber(enrollmentNumber: string): Promise<StudentDocument | null> {
    return StudentModel.findOne({ enrollmentNumber }).exec();
  }

  async findByEmail(email: string): Promise<StudentDocument | null> {
    return StudentModel.findOne({ email }).exec();
  }

  async update(id: string, student: UpdateStudentRecord): Promise<StudentDocument | null> {
    return StudentModel.findByIdAndUpdate(id, student, {
      new: true,
      runValidators: true
    }).exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await StudentModel.findByIdAndDelete(id).exec();

    return result !== null;
  }
}

export const studentRepository = new StudentRepository();

