import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export const teacherAssignmentStatuses = ["ACTIVE", "INACTIVE"] as const;

export type TeacherAssignmentStatus = (typeof teacherAssignmentStatuses)[number];

export interface TeacherAssignment {
  teacherId: Types.ObjectId;
  subjectId: Types.ObjectId;
  classroomId: Types.ObjectId;
  academicYear: string;
  status: TeacherAssignmentStatus;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type TeacherAssignmentDocument = HydratedDocument<TeacherAssignment> & { _id: Types.ObjectId };

const teacherAssignmentSchema = new Schema<TeacherAssignment>(
  {
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
    classroomId: {
      type: Schema.Types.ObjectId,
      ref: "Classroom",
      required: true,
      index: true
    },
    academicYear: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: teacherAssignmentStatuses,
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

teacherAssignmentSchema.index(
  {
    teacherId: 1,
    subjectId: 1,
    classroomId: 1,
    academicYear: 1
  },
  { unique: true }
);

export const TeacherAssignmentModel: Model<TeacherAssignment> = model<TeacherAssignment>(
  "TeacherAssignment",
  teacherAssignmentSchema
);

