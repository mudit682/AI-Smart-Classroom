import type { Types } from "mongoose";
import { StudentEnrollmentModel } from "../../student-enrollments/models/student-enrollment.model.js";
import {
  AttendanceRecordModel,
  type AttendanceRecordDocument,
  type AttendanceRecordStatus
} from "../models/attendance-record.model.js";

export interface CreateAttendanceRecordRecord {
  attendanceSessionId: Types.ObjectId;
  lectureScheduleId: Types.ObjectId;
  classroomId: Types.ObjectId;
  subjectId: Types.ObjectId;
  teacherId: Types.ObjectId;
  studentId: Types.ObjectId;
  sessionDate: Date;
  status: AttendanceRecordStatus;
  similarityScore: number;
  sourceView: "left" | "center" | "right";
  sourceFaceIndex: number;
  markedBy: Types.ObjectId;
}

export interface EnrolledStudentRecord {
  studentId: string;
}

export class AttendanceRecordRepository {
  async findActiveEnrolledStudentIds(criteria: {
    classroomId: Types.ObjectId;
    academicYear: string;
  }): Promise<EnrolledStudentRecord[]> {
    const enrollments = await StudentEnrollmentModel.find({
      classroomId: criteria.classroomId,
      academicYear: criteria.academicYear,
      status: "ACTIVE"
    })
      .select("studentId")
      .lean()
      .exec();

    return enrollments.map((enrollment) => ({
      studentId: enrollment.studentId.toString()
    }));
  }

  async findEnrolledStudentIds(criteria: {
    classroomId: Types.ObjectId;
    academicYear: string;
    studentIds: Types.ObjectId[];
  }): Promise<EnrolledStudentRecord[]> {
    const enrollments = await StudentEnrollmentModel.find({
      classroomId: criteria.classroomId,
      academicYear: criteria.academicYear,
      studentId: { $in: criteria.studentIds },
      status: "ACTIVE"
    })
      .select("studentId")
      .lean()
      .exec();

    return enrollments.map((enrollment) => ({
      studentId: enrollment.studentId.toString()
    }));
  }

  async findBySessionAndStudents(
    attendanceSessionId: Types.ObjectId,
    studentIds: Types.ObjectId[]
  ): Promise<AttendanceRecordDocument[]> {
    return AttendanceRecordModel.find({
      attendanceSessionId,
      studentId: { $in: studentIds }
    }).exec();
  }

  async create(record: CreateAttendanceRecordRecord): Promise<AttendanceRecordDocument> {
    return AttendanceRecordModel.create(record);
  }

  async countByAttendanceSession(attendanceSessionId: Types.ObjectId): Promise<number> {
    return AttendanceRecordModel.countDocuments({
      attendanceSessionId,
      status: "PRESENT"
    }).exec();
  }
}

export const attendanceRecordRepository = new AttendanceRecordRepository();
