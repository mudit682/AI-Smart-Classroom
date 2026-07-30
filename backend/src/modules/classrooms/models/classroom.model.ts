import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export const classroomStatuses = ["ACTIVE", "INACTIVE"] as const;
export const classroomSections = ["A", "B", "C", "D"] as const;

export type ClassroomStatus = (typeof classroomStatuses)[number];
export type ClassroomSection = (typeof classroomSections)[number];

export interface Classroom {
  name: string;
  department: string;
  semester: number;
  section: ClassroomSection;
  academicYear: string;
  capacity: number;
  status: ClassroomStatus;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type ClassroomDocument = HydratedDocument<Classroom> & { _id: Types.ObjectId };

const classroomSchema = new Schema<Classroom>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120
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
    section: {
      type: String,
      enum: classroomSections,
      required: true,
      uppercase: true,
      trim: true
    },
    academicYear: {
      type: String,
      required: true,
      trim: true
    },
    capacity: {
      type: Number,
      required: true,
      min: 10,
      max: 300
    },
    status: {
      type: String,
      enum: classroomStatuses,
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

classroomSchema.index(
  {
    department: 1,
    semester: 1,
    section: 1,
    academicYear: 1
  },
  { unique: true }
);

export const ClassroomModel: Model<Classroom> = model<Classroom>("Classroom", classroomSchema);

