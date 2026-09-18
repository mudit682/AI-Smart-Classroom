import { isValidObjectId, Types } from "mongoose";
import { env } from "../../../config/env.js";
import {
  AppError,
  ConflictError,
  NotFoundError,
  ValidationError,
  type AppError as AppErrorType
} from "../../../shared/errors/index.js";
import type { AuthenticatedUser } from "../../../shared/types/express.js";
import { attendanceSessionRepository } from "../../attendance-sessions/repositories/attendance-session.repository.js";
import { attendanceSessionService } from "../../attendance-sessions/services/attendance-session.service.js";
import { teacherRepository } from "../../teachers/repositories/teacher.repository.js";
import type {
  AttendanceSessionRecognitionRequest,
  AttendanceSessionRecognitionResponse,
  ClassroomRecognitionFaceResult,
  ClassroomRecognitionImageResult,
  ClassroomRecognitionResponse,
  ClassroomRecognitionStudent,
  ClassroomRecognitionView,
  FaceRecognitionImageResult,
  FaceRecognitionMatchRequest,
  FaceRecognitionMatchResponse,
  FaceRecognitionProcessImageResponse
} from "../dtos/face-recognition.dto.js";
import {
  faceRecognitionAiClient,
  type FaceRecognitionAiClient
} from "./face-recognition-ai-client.js";
import {
  faceRecognitionRepository,
  type EnrolledFaceEmbeddingRecord
} from "../repositories/face-recognition.repository.js";

const FACE_EMBEDDING_DIMENSION = 512;

interface StudentBestScore {
  studentId: string;
  similarityScore: number;
}

interface ClassroomRecognitionImageInput {
  view: ClassroomRecognitionView;
  file: Express.Multer.File;
}

export class FaceRecognitionService {
  constructor(
    private readonly faceRecognitions = faceRecognitionRepository,
    private readonly aiClient: FaceRecognitionAiClient = faceRecognitionAiClient,
    private readonly attendanceSessions = attendanceSessionService
  ) {}

  async match(input: FaceRecognitionMatchRequest): Promise<FaceRecognitionMatchResponse> {
    const enrolledEmbeddings = await this.faceRecognitions.findEnrolledEmbeddings();
    return this.matchAgainstEnrolledEmbeddings(input, enrolledEmbeddings);
  }

  async processImage(file: Express.Multer.File): Promise<FaceRecognitionProcessImageResponse> {
    const processedImage = await this.aiClient.processImage(file);
    const enrolledEmbeddings = await this.faceRecognitions.findEnrolledEmbeddings();
    return this.buildProcessImageResponse(processedImage, enrolledEmbeddings);
  }

  async processClassroomImages(files: ClassroomRecognitionImageInput[]): Promise<ClassroomRecognitionResponse> {
    const enrolledEmbeddings = await this.faceRecognitions.findEnrolledEmbeddings();
    const images = await Promise.all(
      files.map(async ({ view, file }): Promise<ClassroomRecognitionImageResult> => {
        let processedImage: Awaited<ReturnType<FaceRecognitionAiClient["processImage"]>>;

        try {
          processedImage = await this.aiClient.processImage(file);
        } catch (error) {
          if (this.isNoFaceDetectedError(error)) {
            return {
              view,
              totalDetectedFaces: 0,
              processedFaces: 0,
              rejectedFaces: 0,
              results: []
            };
          }

          throw error;
        }

        const imageResult = this.buildProcessImageResponse(processedImage, enrolledEmbeddings);

        return {
          view,
          totalDetectedFaces: imageResult.totalDetectedFaces,
          processedFaces: imageResult.processedFaces,
          rejectedFaces: imageResult.rejectedFaces,
          results: imageResult.results.map((result): ClassroomRecognitionFaceResult => ({
            ...result,
            view
          }))
        };
      })
    );

    const recognizedStudents = this.deduplicateRecognizedStudents(images);

    return {
      recognizedStudents,
      recognizedStudentCount: recognizedStudents.length,
      totalDetectedFaces: images.reduce((sum, image) => sum + image.totalDetectedFaces, 0),
      processedFaces: images.reduce((sum, image) => sum + image.processedFaces, 0),
      rejectedFaces: images.reduce((sum, image) => sum + image.rejectedFaces, 0),
      images
    };
  }

  async processAttendanceSessionImages(
    input: AttendanceSessionRecognitionRequest,
    files: ClassroomRecognitionImageInput[],
    actor: AuthenticatedUser
  ): Promise<AttendanceSessionRecognitionResponse> {
    const attendanceSession = input.attendanceSessionId
      ? await this.attendanceSessions.findById(input.attendanceSessionId)
      : await this.startAuthorizedAttendanceSession(input, actor);

    this.assertTeacherOwnsAttendanceSession(attendanceSession.teacher.email, actor.email);

    if (attendanceSession.status !== "ACTIVE") {
      throw new ConflictError("Only active attendance sessions can accept classroom recognition images.");
    }

    const recognition = await this.processClassroomImages(files);

    return {
      attendanceSessionId: attendanceSession.id,
      recognition
    };
  }

  private async startAuthorizedAttendanceSession(
    input: AttendanceSessionRecognitionRequest,
    actor: AuthenticatedUser
  ) {
    if (!input.lectureScheduleId) {
      throw new ValidationError("Lecture schedule id is required when attendance session id is not provided.");
    }

    const lectureSchedule = await attendanceSessionRepository.findLectureScheduleById(
      this.toObjectId(input.lectureScheduleId, "Lecture schedule id is invalid.")
    );

    if (!lectureSchedule) {
      throw new NotFoundError("Lecture schedule was not found.");
    }

    const teacher = await teacherRepository.findById(lectureSchedule.teacherId.toString());

    if (!teacher) {
      throw new NotFoundError("Teacher was not found.");
    }

    this.assertTeacherOwnsAttendanceSession(teacher.email, actor.email);

    return this.attendanceSessions.start(
      {
        lectureScheduleId: input.lectureScheduleId,
        sessionDate: input.sessionDate
      },
      actor.userId
    );
  }

  private buildProcessImageResponse(
    processedImage: Awaited<ReturnType<FaceRecognitionAiClient["processImage"]>>,
    enrolledEmbeddings: EnrolledFaceEmbeddingRecord[]
  ): FaceRecognitionProcessImageResponse {
    const matchedFaces = processedImage.faces.map((face): FaceRecognitionImageResult => {
      const matchResult = this.matchAgainstEnrolledEmbeddings({ embedding: face.embedding }, enrolledEmbeddings);

      return {
        faceIndex: face.faceIndex,
        boundingBox: face.boundingBox,
        detectionConfidence: face.confidence,
        studentId: matchResult.studentId,
        similarityScore: matchResult.similarityScore,
        status: matchResult.status
      };
    });

    const rejectedFaces: FaceRecognitionImageResult[] = processedImage.rejections.map((face) => ({
      faceIndex: face.faceIndex,
      boundingBox: face.boundingBox,
      detectionConfidence: face.confidence,
      studentId: null,
      similarityScore: 0,
      status: "NO_MATCH",
      rejectionReason: face.reason
    }));

    const results = [...matchedFaces, ...rejectedFaces].sort((left, right) => left.faceIndex - right.faceIndex);

    return {
      totalDetectedFaces: processedImage.totalDetectedFaces,
      processedFaces: processedImage.processedFaces,
      rejectedFaces: processedImage.rejectedFaces,
      results
    };
  }

  private deduplicateRecognizedStudents(images: ClassroomRecognitionImageResult[]): ClassroomRecognitionStudent[] {
    const bestByStudentId = new Map<string, ClassroomRecognitionStudent>();

    for (const image of images) {
      for (const result of image.results) {
        if (result.status !== "MATCH" || !result.studentId) {
          continue;
        }

        const currentBest = bestByStudentId.get(result.studentId);

        if (currentBest && currentBest.similarityScore >= result.similarityScore) {
          continue;
        }

        bestByStudentId.set(result.studentId, {
          studentId: result.studentId,
          similarityScore: result.similarityScore,
          source: {
            view: image.view,
            faceIndex: result.faceIndex,
            boundingBox: result.boundingBox,
            detectionConfidence: result.detectionConfidence
          }
        });
      }
    }

    return [...bestByStudentId.values()].sort((left, right) => right.similarityScore - left.similarityScore);
  }

  private isNoFaceDetectedError(error: unknown): boolean {
    if (!(error instanceof ValidationError)) {
      return false;
    }

    const details = (error as AppErrorType).details;

    return (
      !!details &&
      typeof details === "object" &&
      "code" in details &&
      (details as { code?: unknown }).code === "NO_FACE_DETECTED"
    );
  }

  private assertTeacherOwnsAttendanceSession(sessionTeacherEmail: string, actorEmail: string): void {
    if (sessionTeacherEmail.toLowerCase() !== actorEmail.toLowerCase()) {
      throw new AppError("You are not authorized to process recognition for this attendance session.", 403, {
        code: "AUTHORIZATION_ERROR"
      });
    }
  }

  private toObjectId(id: string, errorMessage: string): Types.ObjectId {
    if (!isValidObjectId(id)) {
      throw new ValidationError(errorMessage);
    }

    return new Types.ObjectId(id);
  }

  private matchAgainstEnrolledEmbeddings(
    input: FaceRecognitionMatchRequest,
    enrolledEmbeddings: EnrolledFaceEmbeddingRecord[]
  ): FaceRecognitionMatchResponse {
    const queryEmbedding = this.normalizeEmbedding(input.embedding, "Query embedding");
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
