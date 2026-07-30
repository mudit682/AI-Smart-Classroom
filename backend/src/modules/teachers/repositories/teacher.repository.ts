import type { Types } from "mongoose";
import { TeacherModel, type Teacher, type TeacherDocument, type TeacherStatus } from "../models/teacher.model.js";

export interface CreateTeacherRecord {
  employeeId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  status: TeacherStatus;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
}

export type UpdateTeacherRecord = Partial<
  Pick<Teacher, "employeeId" | "name" | "email" | "department" | "designation" | "status">
> & {
  updatedBy: Types.ObjectId;
};

export class TeacherRepository {
  async create(teacher: CreateTeacherRecord): Promise<TeacherDocument> {
    return TeacherModel.create(teacher);
  }

  async findAll(): Promise<TeacherDocument[]> {
    return TeacherModel.find().sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<TeacherDocument | null> {
    return TeacherModel.findById(id).exec();
  }

  async findByEmployeeId(employeeId: string): Promise<TeacherDocument | null> {
    return TeacherModel.findOne({ employeeId }).exec();
  }

  async findByEmail(email: string): Promise<TeacherDocument | null> {
    return TeacherModel.findOne({ email }).exec();
  }

  async update(id: string, teacher: UpdateTeacherRecord): Promise<TeacherDocument | null> {
    return TeacherModel.findByIdAndUpdate(id, teacher, {
      new: true,
      runValidators: true
    }).exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await TeacherModel.findByIdAndDelete(id).exec();

    return result !== null;
  }
}

export const teacherRepository = new TeacherRepository();

