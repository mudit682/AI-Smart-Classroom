import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export const lectureScheduleStatuses = ["ACTIVE", "INACTIVE"] as const;
export const lectureScheduleDays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;

export type LectureScheduleStatus = (typeof lectureScheduleStatuses)[number];
export type LectureScheduleDay = (typeof lectureScheduleDays)[number];

export interface LectureSchedule {
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
  createdAt: Date;
  updatedAt: Date;
}

export type LectureScheduleDocument = HydratedDocument<LectureSchedule> & { _id: Types.ObjectId };

const lectureScheduleSchema = new Schema<LectureSchedule>(
  {
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
    academicYear: {
      type: String,
      required: true,
      trim: true
    },
    semester: {
      type: String,
      required: true,
      trim: true
    },
    dayOfWeek: {
      type: String,
      enum: lectureScheduleDays,
      required: true
    },
    startTime: {
      type: String,
      required: true,
      trim: true
    },
    endTime: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: lectureScheduleStatuses,
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

lectureScheduleSchema.index(
  {
    classroomId: 1,
    dayOfWeek: 1,
    startTime: 1,
    endTime: 1
  },
  { unique: true }
);

lectureScheduleSchema.index({
  classroomId: 1,
  dayOfWeek: 1,
  academicYear: 1
});

export const LectureScheduleModel: Model<LectureSchedule> = model<LectureSchedule>(
  "LectureSchedule",
  lectureScheduleSchema
);

