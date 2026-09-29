import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";
import type { ClassroomRecognitionView } from "../../face-recognition/dtos/face-recognition.dto.js";

export const attendanceRecordStatuses = ["PRESENT"] as const;

export type AttendanceRecordStatus = (typeof attendanceRecordStatuses)[number];

export interface AttendanceRecord {
  attendanceSessionId: Types.ObjectId;
  lectureScheduleId: Types.ObjectId;
  classroomId: Types.ObjectId;
  subjectId: Types.ObjectId;
  teacherId: Types.ObjectId;
  studentId: Types.ObjectId;
  sessionDate: Date;
  status: AttendanceRecordStatus;
  similarityScore: number;
  sourceView: ClassroomRecognitionView;
  sourceFaceIndex: number;
  markedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type AttendanceRecordDocument = HydratedDocument<AttendanceRecord> & { _id: Types.ObjectId };

const attendanceRecordSchema = new Schema<AttendanceRecord>(
  {
    attendanceSessionId: {
      type: Schema.Types.ObjectId,
      ref: "AttendanceSession",
      required: true,
      index: true
    },
    lectureScheduleId: {
      type: Schema.Types.ObjectId,
      ref: "LectureSchedule",
      required: true,
      index: true
    },
    classroomId: {
      type: Schema.Types.ObjectId,
      ref: "Classroom",
      required: true,
      index: true
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true
    },
    sessionDate: {
      type: Date,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: attendanceRecordStatuses,
      default: "PRESENT",
      required: true
    },
    similarityScore: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    },
    sourceView: {
      type: String,
      enum: ["left", "center", "right"],
      required: true
    },
    sourceFaceIndex: {
      type: Number,
      required: true,
      min: 0
    },
    markedBy: {
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

attendanceRecordSchema.index(
  {
    attendanceSessionId: 1,
    studentId: 1
  },
  { unique: true }
);

export const AttendanceRecordModel: Model<AttendanceRecord> = model<AttendanceRecord>(
  "AttendanceRecord",
  attendanceRecordSchema
);
