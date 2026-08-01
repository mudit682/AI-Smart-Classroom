import type { Types } from "mongoose";
import { ClassroomModel } from "../../classrooms/models/classroom.model.js";
import { SubjectModel } from "../../subjects/models/subject.model.js";
import { TeacherAssignmentModel } from "../../teacher-assignments/models/teacher-assignment.model.js";
import { TeacherModel } from "../../teachers/models/teacher.model.js";
import {
  LectureScheduleModel,
  type LectureSchedule,
  type LectureScheduleDay,
  type LectureScheduleDocument,
  type LectureScheduleStatus
} from "../models/lecture-schedule.model.js";

export interface CreateLectureScheduleRecord {
  teacherAssignmentId: Types.ObjectId;
  classroomId: Types.ObjectId;
  subjectId: Types.ObjectId;
  teacherId: Types.ObjectId;
  academicYear: string;
  semester: string;
  dayOfWeek: LectureScheduleDay;
  startTime: string;
  endTime: string;
  status: LectureScheduleStatus;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
}

export interface LectureScheduleSlotCriteria {
  classroomId: Types.ObjectId;
  dayOfWeek: LectureScheduleDay;
  startTime: string;
  endTime: string;
}

export interface LectureScheduleOverlapCriteria {
  classroomId: Types.ObjectId;
  dayOfWeek: LectureScheduleDay;
  startTime: string;
  endTime: string;
  excludeId?: string;
}

export type UpdateLectureScheduleRecord = Partial<
  Pick<
    LectureSchedule,
    | "teacherAssignmentId"
    | "classroomId"
    | "subjectId"
    | "teacherId"
    | "academicYear"
    | "semester"
    | "dayOfWeek"
    | "startTime"
    | "endTime"
    | "status"
  >
> & {
  updatedBy: Types.ObjectId;
};

export class LectureScheduleRepository {
  async create(schedule: CreateLectureScheduleRecord): Promise<LectureScheduleDocument> {
    return LectureScheduleModel.create(schedule);
  }

  async findAll(): Promise<LectureScheduleDocument[]> {
    return this.withPopulation(LectureScheduleModel.find().sort({ createdAt: -1 })).exec();
  }

  async findById(id: string): Promise<LectureScheduleDocument | null> {
    return this.withPopulation(LectureScheduleModel.findById(id)).exec();
  }

  async findBySlot(criteria: LectureScheduleSlotCriteria): Promise<LectureScheduleDocument | null> {
    return LectureScheduleModel.findOne(criteria).exec();
  }

  async findOverlapping(criteria: LectureScheduleOverlapCriteria): Promise<LectureScheduleDocument | null> {
    const query = LectureScheduleModel.findOne({
      classroomId: criteria.classroomId,
      dayOfWeek: criteria.dayOfWeek,
      startTime: { $lt: criteria.endTime },
      endTime: { $gt: criteria.startTime },
      ...(criteria.excludeId ? { _id: { $ne: criteria.excludeId } } : {})
    });

    return query.exec();
  }

  async update(id: string, schedule: UpdateLectureScheduleRecord): Promise<LectureScheduleDocument | null> {
    const query = LectureScheduleModel.findByIdAndUpdate(id, schedule, {
      new: true,
      runValidators: true
    });

    return this.withPopulation(query).exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await LectureScheduleModel.findByIdAndDelete(id).exec();

    return result !== null;
  }

  async teacherAssignmentExists(id: Types.ObjectId): Promise<boolean> {
    const assignment = await TeacherAssignmentModel.exists({ _id: id }).exec();

    return assignment !== null;
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
      .populate("teacherAssignmentId")
      .populate("classroomId")
      .populate("subjectId")
      .populate("teacherId");
  }
}

export const lectureScheduleRepository = new LectureScheduleRepository();

