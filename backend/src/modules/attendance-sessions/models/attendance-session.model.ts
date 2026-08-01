import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export const attendanceSessionStatuses = ["ACTIVE", "COMPLETED", "CANCELLED"] as const;

export type AttendanceSessionStatus = (typeof attendanceSessionStatuses)[number];

export interface AttendanceSession {
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
  status: AttendanceSessionStatus;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type AttendanceSessionDocument = HydratedDocument<AttendanceSession> & { _id: Types.ObjectId };

const attendanceSessionSchema = new Schema<AttendanceSession>(
  {
    lectureScheduleId: {
      type: Schema.Types.ObjectId,
      ref: "LectureSchedule",
      required: true,
      index: true
    },
    teacherAssignmentId: {
      type: Schema.Types.ObjectId,
      ref: "TeacherAssignment",
      required: true,
      index: true
    },
    classroomId: {
      type: Schema.Types.ObjectId,
      ref: "Classroom",
      required: true,
      index: true
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true
    },
    sessionDate: {
      type: Date,
      required: true,
      index: true
    },
    startedAt: {
      type: Date,
      required: true
    },
    endedAt: {
      type: Date,
      default: null
    },
    captureCount: {
      type: Number,
      default: 0,
      min: 0,
      required: true
    },
    maxCaptures: {
      type: Number,
      default: 3,
      min: 1,
      required: true
    },
    totalStudents: {
      type: Number,
      required: true,
      min: 0
    },
    recognizedStudents: {
      type: Number,
      default: 0,
      min: 0,
      required: true
    },
    absentStudents: {
      type: Number,
      default: 0,
      min: 0,
      required: true
    },
    status: {
      type: String,
      enum: attendanceSessionStatuses,
      default: "ACTIVE",
      required: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

attendanceSessionSchema.index(
  {
    lectureScheduleId: 1,
    sessionDate: 1
  },
  {
    unique: true,
    partialFilterExpression: {
      status: "ACTIVE"
    }
  }
);

export const AttendanceSessionModel: Model<AttendanceSession> = model<AttendanceSession>(
  "AttendanceSession",
  attendanceSessionSchema
);

