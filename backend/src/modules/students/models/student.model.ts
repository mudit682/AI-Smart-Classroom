import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export interface Student {
  name: string;
  enrollmentNumber: string;
  email: string;
  department: string;
  semester: number;
  section: string;
  faceEnrolled: boolean;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type StudentDocument = HydratedDocument<Student> & { _id: Types.ObjectId };

const studentSchema = new Schema<Student>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120
    },
    enrollmentNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
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
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    section: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 20
    },
    faceEnrolled: {
      type: Boolean,
      default: false,
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

studentSchema.index({ enrollmentNumber: 1 }, { unique: true });
studentSchema.index({ email: 1 }, { unique: true });

export const StudentModel: Model<Student> = model<Student>("Student", studentSchema);

