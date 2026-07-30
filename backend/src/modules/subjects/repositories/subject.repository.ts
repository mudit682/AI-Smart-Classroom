import type { Types } from "mongoose";
import { SubjectModel, type Subject, type SubjectDocument, type SubjectStatus } from "../models/subject.model.js";

export interface CreateSubjectRecord {
  subjectCode: string;
  name: string;
  department: string;
  semester: number;
  credits: number;
  status: SubjectStatus;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
}

export type UpdateSubjectRecord = Partial<
  Pick<Subject, "subjectCode" | "name" | "department" | "semester" | "credits" | "status">
> & {
  updatedBy: Types.ObjectId;
};

export class SubjectRepository {
  async create(subject: CreateSubjectRecord): Promise<SubjectDocument> {
    return SubjectModel.create(subject);
  }

  async findAll(): Promise<SubjectDocument[]> {
    return SubjectModel.find().sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<SubjectDocument | null> {
    return SubjectModel.findById(id).exec();
  }

  async findBySubjectCode(subjectCode: string): Promise<SubjectDocument | null> {
    return SubjectModel.findOne({ subjectCode }).exec();
  }

  async update(id: string, subject: UpdateSubjectRecord): Promise<SubjectDocument | null> {
    return SubjectModel.findByIdAndUpdate(id, subject, {
      new: true,
      runValidators: true
    }).exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await SubjectModel.findByIdAndDelete(id).exec();

    return result !== null;
  }
}

export const subjectRepository = new SubjectRepository();

