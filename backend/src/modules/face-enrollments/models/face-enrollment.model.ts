import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export const faceEnrollmentStatuses = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "FAILED"] as const;

export type FaceEnrollmentStatus = (typeof faceEnrollmentStatuses)[number];

export interface FaceEnrollment {
  studentId: Types.ObjectId;
  enrollmentStatus: FaceEnrollmentStatus;
  faceImages: string[];
  totalImages: number;
  requiredImages: number;
  embeddingGenerated: boolean;
  embeddingVersion: string;
  lastEnrolledAt: Date | null;
  notes?: string;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type FaceEnrollmentDocument = HydratedDocument<FaceEnrollment> & { _id: Types.ObjectId };

const faceEnrollmentSchema = new Schema<FaceEnrollment>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      unique: true,
      index: true
    },
    enrollmentStatus: {
      type: String,
      enum: faceEnrollmentStatuses,
      default: "NOT_STARTED",
      required: true
    },
    faceImages: {
      type: [String],
      default: [],
      required: true
    },
    totalImages: {
      type: Number,
      default: 0,
      min: 0,
      required: true
    },
    requiredImages: {
      type: Number,
      default: 10,
      min: 1,
      required: true
    },
    embeddingGenerated: {
      type: Boolean,
      default: false,
      required: true
    },
    embeddingVersion: {
      type: String,
      default: "",
      trim: true
    },
    lastEnrolledAt: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000
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

export const FaceEnrollmentModel: Model<FaceEnrollment> = model<FaceEnrollment>(
  "FaceEnrollment",
  faceEnrollmentSchema
);
