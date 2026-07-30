import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export const teacherStatuses = ["ACTIVE", "INACTIVE"] as const;

export type TeacherStatus = (typeof teacherStatuses)[number];

export interface Teacher {
  employeeId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  status: TeacherStatus;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type TeacherDocument = HydratedDocument<Teacher> & { _id: Types.ObjectId };

const teacherSchema = new Schema<Teacher>(
  {
    employeeId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    department: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    designation: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    status: {
      type: String,
      enum: teacherStatuses,
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

teacherSchema.index({ employeeId: 1 }, { unique: true });
teacherSchema.index({ email: 1 }, { unique: true });

export const TeacherModel: Model<Teacher> = model<Teacher>("Teacher", teacherSchema);

