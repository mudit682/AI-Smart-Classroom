import { env } from "../../../config/env.js";
import { ValidationError } from "../../../shared/errors/index.js";
import type {
  FaceRecognitionMatchRequest,
  FaceRecognitionMatchResponse
} from "../dtos/face-recognition.dto.js";
import {
  faceRecognitionRepository,
  type EnrolledFaceEmbeddingRecord
} from "../repositories/face-recognition.repository.js";

const FACE_EMBEDDING_DIMENSION = 512;

interface StudentBestScore {
  studentId: string;
  similarityScore: number;
}

export class FaceRecognitionService {
  constructor(private readonly faceRecognitions = faceRecognitionRepository) {}

  async match(input: FaceRecognitionMatchRequest): Promise<FaceRecognitionMatchResponse> {
    const queryEmbedding = this.normalizeEmbedding(input.embedding, "Query embedding");
    const enrolledEmbeddings = await this.faceRecognitions.findEnrolledEmbeddings();
    const bestMatch = this.findBestOverallStudent(queryEmbedding, enrolledEmbeddings);
    const threshold = this.getRecognitionThreshold();

    if (!bestMatch || bestMatch.similarityScore < threshold) {
      return {
        matched: false,
        status: "NO_MATCH",
        studentId: null,
        similarityScore: bestMatch?.similarityScore ?? 0,
        threshold
      };
    }

    return {
      matched: true,
      status: "MATCH",
      studentId: bestMatch.studentId,
      similarityScore: bestMatch.similarityScore,
      threshold
    };
  }

  private findBestOverallStudent(
    queryEmbedding: number[],
    enrolledEmbeddings: EnrolledFaceEmbeddingRecord[]
  ): StudentBestScore | null {
    const bestScoreByStudent = new Map<string, StudentBestScore>();

    for (const enrolledEmbedding of enrolledEmbeddings) {
      const storedEmbedding = this.normalizeEmbedding(enrolledEmbedding.embedding, "Stored embedding");
      const similarityScore = this.cosineSimilarity(queryEmbedding, storedEmbedding);
      const currentBest = bestScoreByStudent.get(enrolledEmbedding.studentId);

      if (!currentBest || similarityScore > currentBest.similarityScore) {
        bestScoreByStudent.set(enrolledEmbedding.studentId, {
          studentId: enrolledEmbedding.studentId,
          similarityScore
        });
      }
    }

    return [...bestScoreByStudent.values()].reduce<StudentBestScore | null>((bestOverall, studentScore) => {
      if (!bestOverall || studentScore.similarityScore > bestOverall.similarityScore) {
        return studentScore;
      }

      return bestOverall;
    }, null);
  }

  private normalizeEmbedding(embedding: number[], label: string): number[] {
    if (!Array.isArray(embedding) || embedding.length !== FACE_EMBEDDING_DIMENSION) {
      throw new ValidationError(`${label} must contain exactly 512 values.`);
    }

    if (!embedding.every((value) => typeof value === "number" && Number.isFinite(value))) {
      throw new ValidationError(`${label} must contain only finite numbers.`);
    }

    const norm = Math.sqrt(embedding.reduce((sum, value) => sum + value * value, 0));

    if (norm === 0) {
      throw new ValidationError(`${label} cannot be a zero vector.`);
    }

    return embedding.map((value) => value / norm);
  }

  private cosineSimilarity(left: number[], right: number[]): number {
    return left.reduce((sum, value, index) => sum + value * right[index], 0);
  }

  private getRecognitionThreshold(): number {
    const threshold = env.FACE_RECOGNITION_THRESHOLD;

    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
      throw new ValidationError("Face recognition threshold must be between 0 and 1.");
    }

    return threshold;
  }
}

export const faceRecognitionService = new FaceRecognitionService();
