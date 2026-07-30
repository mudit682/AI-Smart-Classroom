import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export const subjectStatuses = ["ACTIVE", "INACTIVE"] as const;

export type SubjectStatus = (typeof subjectStatuses)[number];

export interface Subject {
  subjectCode: string;
  name: string;
  department: string;
  semester: number;
  credits: number;
  status: SubjectStatus;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type SubjectDocument = HydratedDocument<Subject> & { _id: Types.ObjectId };

const subjectSchema = new Schema<Subject>(
  {
    subjectCode: {
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
      maxlength: 160
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
      max: 8
    },
    credits: {
      type: Number,
      required: true,
      min: 1,
      max: 6
    },
    status: {
      type: String,
      enum: subjectStatuses,
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

subjectSchema.index({ subjectCode: 1 }, { unique: true });

export const SubjectModel: Model<Subject> = model<Subject>("Subject", subjectSchema);

