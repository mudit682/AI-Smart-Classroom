import type { Types } from "mongoose";
import { ClassroomModel } from "../../classrooms/models/classroom.model.js";
import { StudentModel } from "../../students/models/student.model.js";
import {
  StudentEnrollmentModel,
  type StudentEnrollment,
  type StudentEnrollmentDocument,
  type StudentEnrollmentStatus
} from "../models/student-enrollment.model.js";

export interface CreateStudentEnrollmentRecord {
  studentId: Types.ObjectId;
  classroomId: Types.ObjectId;
  academicYear: string;
  rollNumber: string;
  status: StudentEnrollmentStatus;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
}

export interface StudentEnrollmentUniquenessCriteria {
  studentId: Types.ObjectId;
  classroomId: Types.ObjectId;
  academicYear: string;
}

export interface RollNumberUniquenessCriteria {
  classroomId: Types.ObjectId;
  academicYear: string;
  rollNumber: string;
}

export type UpdateStudentEnrollmentRecord = Partial<
  Pick<StudentEnrollment, "studentId" | "classroomId" | "academicYear" | "rollNumber" | "status">
> & {
  updatedBy: Types.ObjectId;
};

export class StudentEnrollmentRepository {
  async create(enrollment: CreateStudentEnrollmentRecord): Promise<StudentEnrollmentDocument> {
    return StudentEnrollmentModel.create(enrollment);
  }

  async findAll(): Promise<StudentEnrollmentDocument[]> {
    return this.withPopulation(StudentEnrollmentModel.find().sort({ createdAt: -1 })).exec();
  }

  async findById(id: string): Promise<StudentEnrollmentDocument | null> {
    return this.withPopulation(StudentEnrollmentModel.findById(id)).exec();
  }

  async findByUniqueCriteria(criteria: StudentEnrollmentUniquenessCriteria): Promise<StudentEnrollmentDocument | null> {
    return StudentEnrollmentModel.findOne(criteria).exec();
  }

  async findByRollNumberCriteria(criteria: RollNumberUniquenessCriteria): Promise<StudentEnrollmentDocument | null> {
    return StudentEnrollmentModel.findOne(criteria).exec();
  }

  async update(id: string, enrollment: UpdateStudentEnrollmentRecord): Promise<StudentEnrollmentDocument | null> {
    const query = StudentEnrollmentModel.findByIdAndUpdate(id, enrollment, {
      new: true,
      runValidators: true
    });

    return this.withPopulation(query).exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await StudentEnrollmentModel.findByIdAndDelete(id).exec();

    return result !== null;
  }

  async studentExists(id: Types.ObjectId): Promise<boolean> {
    const student = await StudentModel.exists({ _id: id }).exec();

    return student !== null;
  }

  async classroomExists(id: Types.ObjectId): Promise<boolean> {
    const classroom = await ClassroomModel.exists({ _id: id }).exec();

    return classroom !== null;
  }

  private withPopulation<QueryType>(query: QueryType): QueryType {
    return (query as any).populate("studentId").populate("classroomId");
  }
}

export const studentEnrollmentRepository = new StudentEnrollmentRepository();

