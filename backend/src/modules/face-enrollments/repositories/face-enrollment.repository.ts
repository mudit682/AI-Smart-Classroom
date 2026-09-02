import type { Types } from "mongoose";
import { StudentModel } from "../../students/models/student.model.js";
import { FaceEmbeddingModel, type FaceEmbeddingDocument } from "../models/face-embedding.model.js";
import {
  FaceEnrollmentModel,
  type FaceEnrollment,
  type FaceEnrollmentDocument,
  type FaceEnrollmentStatus
} from "../models/face-enrollment.model.js";

export interface CreateFaceEnrollmentRecord {
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
}

export type UpdateFaceEnrollmentRecord = Partial<
  Pick<
    FaceEnrollment,
    | "studentId"
    | "enrollmentStatus"
    | "faceImages"
    | "totalImages"
    | "requiredImages"
    | "embeddingGenerated"
    | "embeddingVersion"
    | "lastEnrolledAt"
    | "notes"
  >
> & {
  updatedBy: Types.ObjectId;
};

export interface CreateFaceEmbeddingRecord {
  studentId: Types.ObjectId;
  faceEnrollmentId: Types.ObjectId;
  imagePath: string;
  embedding: number[];
  modelIdentifier: string;
}

export class FaceEnrollmentRepository {
  async create(enrollment: CreateFaceEnrollmentRecord): Promise<FaceEnrollmentDocument> {
    return FaceEnrollmentModel.create(enrollment);
  }

  async findAll(): Promise<FaceEnrollmentDocument[]> {
    return this.withPopulation(FaceEnrollmentModel.find().sort({ createdAt: -1 })).exec();
  }

  async findById(id: string): Promise<FaceEnrollmentDocument | null> {
    return this.withPopulation(FaceEnrollmentModel.findById(id)).exec();
  }

  async findByStudentId(studentId: Types.ObjectId): Promise<FaceEnrollmentDocument | null> {
    return this.withPopulation(FaceEnrollmentModel.findOne({ studentId })).exec();
  }

  async findByStudentEmail(email: string): Promise<FaceEnrollmentDocument[]> {
    return FaceEnrollmentModel.find()
      .populate({
        path: "studentId",
        match: { email }
      })
      .sort({ createdAt: -1 })
      .exec()
      .then((enrollments: FaceEnrollmentDocument[]) => enrollments.filter((enrollment) => enrollment.studentId));
  }

  async update(id: string, enrollment: UpdateFaceEnrollmentRecord): Promise<FaceEnrollmentDocument | null> {
    const query = FaceEnrollmentModel.findByIdAndUpdate(id, enrollment, {
      new: true,
      runValidators: true
    });

    return this.withPopulation(query).exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await FaceEnrollmentModel.findByIdAndDelete(id).exec();

    return result !== null;
  }

  async createEmbeddings(embeddings: CreateFaceEmbeddingRecord[]): Promise<FaceEmbeddingDocument[]> {
    if (embeddings.length === 0) {
      return [];
    }

    return FaceEmbeddingModel.insertMany(embeddings, { ordered: true });
  }

  async findEmbeddingsByEnrollmentId(faceEnrollmentId: Types.ObjectId): Promise<FaceEmbeddingDocument[]> {
    return FaceEmbeddingModel.find({ faceEnrollmentId }).sort({ createdAt: -1 }).exec();
  }

  async findEmbeddedImagePaths(faceEnrollmentId: Types.ObjectId): Promise<string[]> {
    const embeddings = await FaceEmbeddingModel.find({ faceEnrollmentId }).select("imagePath").lean().exec();

    return embeddings.map((embedding) => embedding.imagePath);
  }

  async deleteEmbeddingsByEnrollmentId(faceEnrollmentId: Types.ObjectId): Promise<void> {
    await FaceEmbeddingModel.deleteMany({ faceEnrollmentId }).exec();
  }

  async studentExists(id: Types.ObjectId): Promise<boolean> {
    const student = await StudentModel.exists({ _id: id }).exec();

    return student !== null;
  }

  private withPopulation<QueryType>(query: QueryType): QueryType {
    return (query as any).populate("studentId");
  }
}

export const faceEnrollmentRepository = new FaceEnrollmentRepository();
