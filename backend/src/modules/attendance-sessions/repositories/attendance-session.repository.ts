import type { Types } from "mongoose";
import { LectureScheduleModel } from "../../lecture-schedules/models/lecture-schedule.model.js";
import { StudentEnrollmentModel } from "../../student-enrollments/models/student-enrollment.model.js";
import {
  AttendanceSessionModel,
  type AttendanceSession,
  type AttendanceSessionDocument,
  type AttendanceRecognitionStatus,
  type AttendanceSessionStatus
} from "../models/attendance-session.model.js";

export interface CreateAttendanceSessionRecord {
  lectureScheduleId: Types.ObjectId;
  teacherAssignmentId: Types.ObjectId;
  classroomId: Types.ObjectId;
  teacherId: Types.ObjectId;
  subjectId: Types.ObjectId;
  sessionDate: Date;
  startedAt: Date;
  endedAt: Date | null;
  captureCount: number;
  maxCaptures: number;
  totalStudents: number;
  recognizedStudents: number;
  absentStudents: number;
  recognitionStatus: AttendanceRecognitionStatus;
  capturedImages: string[];
  status: AttendanceSessionStatus;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
}

export type UpdateAttendanceSessionRecord = Partial<
  Pick<
    AttendanceSession,
    "endedAt" | "recognizedStudents" | "absentStudents" | "recognitionStatus" | "capturedImages" | "status"
  >
> & {
  updatedBy: Types.ObjectId;
};

export interface ActiveSessionCriteria {
  lectureScheduleId: Types.ObjectId;
  sessionDate: Date;
}

export class AttendanceSessionRepository {
  async create(session: CreateAttendanceSessionRecord): Promise<AttendanceSessionDocument> {
    return AttendanceSessionModel.create(session);
  }

  async findAll(): Promise<AttendanceSessionDocument[]> {
    return this.withPopulation(AttendanceSessionModel.find().sort({ createdAt: -1 })).exec();
  }

  async findById(id: string): Promise<AttendanceSessionDocument | null> {
    return this.withPopulation(AttendanceSessionModel.findById(id)).exec();
  }

  async findActiveByLectureScheduleAndDate(criteria: ActiveSessionCriteria): Promise<AttendanceSessionDocument | null> {
    return AttendanceSessionModel.findOne({
      lectureScheduleId: criteria.lectureScheduleId,
      sessionDate: criteria.sessionDate,
      status: "ACTIVE"
    }).exec();
  }

  async update(id: string, session: UpdateAttendanceSessionRecord): Promise<AttendanceSessionDocument | null> {
    const query = AttendanceSessionModel.findByIdAndUpdate(id, session, {
      new: true,
      runValidators: true
    });

    return this.withPopulation(query).exec();
  }

  async findLectureScheduleById(id: Types.ObjectId) {
    return LectureScheduleModel.findById(id).exec();
  }

  async countActiveStudentEnrollments(classroomId: Types.ObjectId, academicYear: string): Promise<number> {
    return StudentEnrollmentModel.countDocuments({
      classroomId,
      academicYear,
      status: "ACTIVE"
    }).exec();
  }

  private withPopulation<QueryType>(query: QueryType): QueryType {
    return (query as any)
      .populate("lectureScheduleId")
      .populate("teacherAssignmentId")
      .populate("classroomId")
      .populate("teacherId")
      .populate("subjectId");
  }
}

export const attendanceSessionRepository = new AttendanceSessionRepository();
