import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export const studentEnrollmentStatuses = ["ACTIVE", "INACTIVE"] as const;

export type StudentEnrollmentStatus = (typeof studentEnrollmentStatuses)[number];

export interface StudentEnrollment {
  studentId: Types.ObjectId;
  classroomId: Types.ObjectId;
  academicYear: string;
  rollNumber: string;
  status: StudentEnrollmentStatus;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type StudentEnrollmentDocument = HydratedDocument<StudentEnrollment> & { _id: Types.ObjectId };

const studentEnrollmentSchema = new Schema<StudentEnrollment>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
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
    rollNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    status: {
      type: String,
      enum: studentEnrollmentStatuses,
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

studentEnrollmentSchema.index(
  {
    studentId: 1,
    classroomId: 1,
    academicYear: 1
  },
  { unique: true }
);

studentEnrollmentSchema.index(
  {
    classroomId: 1,
    academicYear: 1,
    rollNumber: 1
  },
  { unique: true }
);

export const StudentEnrollmentModel: Model<StudentEnrollment> = model<StudentEnrollment>(
  "StudentEnrollment",
  studentEnrollmentSchema
);

