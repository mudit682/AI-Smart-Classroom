import type { Types } from "mongoose";
import { FaceEmbeddingModel } from "../../face-enrollments/models/face-embedding.model.js";

export interface EnrolledFaceEmbeddingRecord {
  studentId: string;
  embedding: number[];
}

export class FaceRecognitionRepository {
  async findEnrolledEmbeddings(): Promise<EnrolledFaceEmbeddingRecord[]> {
    const embeddings = await FaceEmbeddingModel.find()
      .select("studentId embedding")
      .lean()
      .exec();

    return embeddings.map((embedding) => ({
      studentId: embedding.studentId.toString(),
      embedding: embedding.embedding
    }));
  }

  async findEnrolledEmbeddingsByStudentIds(studentIds: Types.ObjectId[]): Promise<EnrolledFaceEmbeddingRecord[]> {
    const embeddings = await FaceEmbeddingModel.find({
      studentId: { $in: studentIds }
    })
      .select("studentId embedding")
      .lean()
      .exec();

    return embeddings.map((embedding) => ({
      studentId: embedding.studentId.toString(),
      embedding: embedding.embedding
    }));
  }
}

export const faceRecognitionRepository = new FaceRecognitionRepository();
