import type { Types } from "mongoose";
import { ClassroomModel } from "../../classrooms/models/classroom.model.js";
import { SubjectModel } from "../../subjects/models/subject.model.js";
import { TeacherModel } from "../../teachers/models/teacher.model.js";
import {
  TeacherAssignmentModel,
  type TeacherAssignment,
  type TeacherAssignmentDocument,
  type TeacherAssignmentStatus
} from "../models/teacher-assignment.model.js";

export interface CreateTeacherAssignmentRecord {
  teacherId: Types.ObjectId;
  subjectId: Types.ObjectId;
  classroomId: Types.ObjectId;
  academicYear: string;
  status: TeacherAssignmentStatus;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
}

export interface TeacherAssignmentUniquenessCriteria {
  teacherId: Types.ObjectId;
  subjectId: Types.ObjectId;
  classroomId: Types.ObjectId;
  academicYear: string;
}

export type UpdateTeacherAssignmentRecord = Partial<
  Pick<TeacherAssignment, "teacherId" | "subjectId" | "classroomId" | "academicYear" | "status">
> & {
  updatedBy: Types.ObjectId;
};

export class TeacherAssignmentRepository {
  async create(assignment: CreateTeacherAssignmentRecord): Promise<TeacherAssignmentDocument> {
    return TeacherAssignmentModel.create(assignment);
  }

  async findAll(): Promise<TeacherAssignmentDocument[]> {
    return this.withPopulation(TeacherAssignmentModel.find().sort({ createdAt: -1 })).exec();
  }

  async findById(id: string): Promise<TeacherAssignmentDocument | null> {
    return this.withPopulation(TeacherAssignmentModel.findById(id)).exec();
  }

  async findByUniqueCriteria(criteria: TeacherAssignmentUniquenessCriteria): Promise<TeacherAssignmentDocument | null> {
    return TeacherAssignmentModel.findOne(criteria).exec();
  }

  async update(id: string, assignment: UpdateTeacherAssignmentRecord): Promise<TeacherAssignmentDocument | null> {
    const query = TeacherAssignmentModel.findByIdAndUpdate(id, assignment, {
      new: true,
      runValidators: true
    });

    return this.withPopulation(query).exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await TeacherAssignmentModel.findByIdAndDelete(id).exec();

    return result !== null;
  }

  async teacherExists(id: Types.ObjectId): Promise<boolean> {
    const teacher = await TeacherModel.exists({ _id: id }).exec();

    return teacher !== null;
  }

  async subjectExists(id: Types.ObjectId): Promise<boolean> {
    const subject = await SubjectModel.exists({ _id: id }).exec();

    return subject !== null;
  }

  async classroomExists(id: Types.ObjectId): Promise<boolean> {
    const classroom = await ClassroomModel.exists({ _id: id }).exec();

    return classroom !== null;
  }

  private withPopulation<QueryType>(query: QueryType): QueryType {
    return (query as any)
      .populate("teacherId")
      .populate("subjectId")
      .populate("classroomId");
  }
}

export const teacherAssignmentRepository = new TeacherAssignmentRepository();

