import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export interface FaceEmbedding {
  studentId: Types.ObjectId;
  faceEnrollmentId: Types.ObjectId;
  imagePath: string;
  embedding: number[];
  modelIdentifier: string;
  createdAt: Date;
  updatedAt: Date;
}

export type FaceEmbeddingDocument = HydratedDocument<FaceEmbedding> & { _id: Types.ObjectId };

const EMBEDDING_DIMENSION = 512;
const NORMALIZATION_TOLERANCE = 0.001;

const faceEmbeddingSchema = new Schema<FaceEmbedding>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true
    },
    faceEnrollmentId: {
      type: Schema.Types.ObjectId,
      ref: "FaceEnrollment",
      required: true,
      index: true
    },
    imagePath: {
      type: String,
      required: true,
      trim: true
    },
    embedding: {
      type: [Number],
      required: true,
      validate: {
        validator(value: number[]): boolean {
          if (!Array.isArray(value) || value.length !== EMBEDDING_DIMENSION) {
            return false;
          }

          if (!value.every((item) => Number.isFinite(item))) {
            return false;
          }

          const norm = Math.sqrt(value.reduce((sum, item) => sum + item * item, 0));

          return Math.abs(norm - 1) <= NORMALIZATION_TOLERANCE;
        },
        message: "Embedding must be a normalized 512-dimensional vector."
      }
    },
    modelIdentifier: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

faceEmbeddingSchema.index({ faceEnrollmentId: 1, imagePath: 1 }, { unique: true });

export const FaceEmbeddingModel: Model<FaceEmbedding> = model<FaceEmbedding>(
  "FaceEmbedding",
  faceEmbeddingSchema
);
