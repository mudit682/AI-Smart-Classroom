import type { Types } from "mongoose";
import {
  ClassroomModel,
  type Classroom,
  type ClassroomDocument,
  type ClassroomSection,
  type ClassroomStatus
} from "../models/classroom.model.js";

export interface CreateClassroomRecord {
  name: string;
  department: string;
  semester: number;
  section: ClassroomSection;
  academicYear: string;
  capacity: number;
  status: ClassroomStatus;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
}

export interface ClassroomUniquenessCriteria {
  department: string;
  semester: number;
  section: ClassroomSection;
  academicYear: string;
}

export type UpdateClassroomRecord = Partial<
  Pick<Classroom, "name" | "department" | "semester" | "section" | "academicYear" | "capacity" | "status">
> & {
  updatedBy: Types.ObjectId;
};

export class ClassroomRepository {
  async create(classroom: CreateClassroomRecord): Promise<ClassroomDocument> {
    return ClassroomModel.create(classroom);
  }

  async findAll(): Promise<ClassroomDocument[]> {
    return ClassroomModel.find().sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<ClassroomDocument | null> {
    return ClassroomModel.findById(id).exec();
  }

  async findByUniqueCriteria(criteria: ClassroomUniquenessCriteria): Promise<ClassroomDocument | null> {
    return ClassroomModel.findOne(criteria).exec();
  }

  async update(id: string, classroom: UpdateClassroomRecord): Promise<ClassroomDocument | null> {
    return ClassroomModel.findByIdAndUpdate(id, classroom, {
      new: true,
      runValidators: true
    }).exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await ClassroomModel.findByIdAndDelete(id).exec();

    return result !== null;
  }
}

export const classroomRepository = new ClassroomRepository();

