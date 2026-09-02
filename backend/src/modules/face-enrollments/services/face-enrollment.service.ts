import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isValidObjectId, Types } from "mongoose";
import { env } from "../../../config/env.js";
import { AppError, ConflictError, NotFoundError, ValidationError } from "../../../shared/errors/index.js";
import type { Student, StudentDocument } from "../../students/models/student.model.js";
import type {
  CreateFaceEnrollmentRequest,
  DeleteFaceEnrollmentResponse,
  FaceEnrollmentActor,
  FaceEmbeddingListResponse,
  FaceEmbeddingResponse,
  FaceEnrollmentListResponse,
  FaceEnrollmentResponse,
  FaceEnrollmentStudentResponse,
  FaceEnrollmentUploadResult,
  GenerateFaceEmbeddingsResponse,
  UpdateFaceEnrollmentRequest
} from "../dtos/face-enrollment.dto.js";
import type { FaceEmbeddingDocument } from "../models/face-embedding.model.js";
import {
  faceEnrollmentStatuses,
  type FaceEnrollmentDocument,
  type FaceEnrollmentStatus
} from "../models/face-enrollment.model.js";
import {
  faceEnrollmentRepository,
  type CreateFaceEmbeddingRecord,
  type CreateFaceEnrollmentRecord,
  type UpdateFaceEnrollmentRecord
} from "../repositories/face-enrollment.repository.js";
import { faceDetectionClient, type FaceDetectionClient, type ProcessedFaceImage } from "./face-detection-client.js";
import { faceEmbeddingClient, type FaceEmbeddingClient, type GeneratedFaceEmbedding } from "./face-embedding-client.js";

type NormalizedFaceEnrollmentCreate = Omit<CreateFaceEnrollmentRecord, "createdBy" | "updatedBy">;
type NormalizedFaceEnrollmentUpdate = Omit<UpdateFaceEnrollmentRecord, "updatedBy">;
type StoredProcessedFaceImage = ProcessedFaceImage & { imagePath: string };

const FACE_EMBEDDING_DIMENSION = 512;
const EMBEDDING_NORMALIZATION_TOLERANCE = 0.001;

export class FaceEnrollmentService {
  constructor(
    private readonly faceEnrollments = faceEnrollmentRepository,
    private readonly detectionClient: FaceDetectionClient = faceDetectionClient,
    private readonly embeddingClient: FaceEmbeddingClient = faceEmbeddingClient
  ) {}

  async create(input: CreateFaceEnrollmentRequest, actor: FaceEnrollmentActor): Promise<FaceEnrollmentResponse> {
    const normalizedInput = this.normalizeCreateInput(input);
    const actorObjectId = this.toObjectId(actor.userId, "Authenticated user id is invalid.");

    await this.ensureStudentExists(normalizedInput.studentId);
    await this.ensureStudentEnrollmentIsAvailable(normalizedInput.studentId);

    const enrollment = await this.createEnrollment({
      ...normalizedInput,
      createdBy: actorObjectId,
      updatedBy: actorObjectId
    });

    return this.findById(enrollment.id, actor);
  }

  async findAll(actor: FaceEnrollmentActor): Promise<FaceEnrollmentListResponse> {
    const enrollments =
      actor.role === "student"
        ? await this.faceEnrollments.findByStudentEmail(actor.email.toLowerCase())
        : await this.faceEnrollments.findAll();

    return {
      faceEnrollments: enrollments.map((enrollment) => this.toResponse(enrollment))
    };
  }

  async findById(id: string, actor: FaceEnrollmentActor): Promise<FaceEnrollmentResponse> {
    this.assertValidId(id, "Face enrollment id is invalid.");

    const enrollment = await this.faceEnrollments.findById(id);

    if (!enrollment) {
      throw new NotFoundError("Face enrollment was not found.");
    }

    this.ensureReadAccess(enrollment, actor);

    return this.toResponse(enrollment);
  }

  async update(id: string, input: UpdateFaceEnrollmentRequest, actor: FaceEnrollmentActor): Promise<FaceEnrollmentResponse> {
    this.assertValidId(id, "Face enrollment id is invalid.");

    const normalizedInput = this.normalizeUpdateInput(input);
    const actorObjectId = this.toObjectId(actor.userId, "Authenticated user id is invalid.");
    const existingEnrollment = await this.faceEnrollments.findById(id);

    if (!existingEnrollment) {
      throw new NotFoundError("Face enrollment was not found.");
    }

    if (normalizedInput.studentId && !normalizedInput.studentId.equals(this.getObjectId(existingEnrollment.studentId))) {
      await this.ensureStudentExists(normalizedInput.studentId);
      await this.ensureStudentEnrollmentIsAvailable(normalizedInput.studentId);
    }

    const updatedEnrollment = await this.updateEnrollment(id, {
      ...normalizedInput,
      updatedBy: actorObjectId
    });

    if (!updatedEnrollment) {
      throw new NotFoundError("Face enrollment was not found.");
    }

    return this.toResponse(updatedEnrollment);
  }

  async delete(id: string): Promise<DeleteFaceEnrollmentResponse> {
    this.assertValidId(id, "Face enrollment id is invalid.");
    const existingEnrollment = await this.faceEnrollments.findById(id);

    if (!existingEnrollment) {
      throw new NotFoundError("Face enrollment was not found.");
    }

    await this.faceEnrollments.deleteEmbeddingsByEnrollmentId(this.getObjectId(existingEnrollment._id));

    const deleted = await this.faceEnrollments.delete(id);

    if (!deleted) {
      throw new NotFoundError("Face enrollment was not found.");
    }

    return {
      message: "Face enrollment deleted successfully."
    };
  }

  async uploadImages(
    studentId: string,
    files: Express.Multer.File[],
    actor: FaceEnrollmentActor
  ): Promise<FaceEnrollmentUploadResult> {
    const studentObjectId = this.toObjectId(studentId, "Student id is invalid.");
    const actorObjectId = this.toObjectId(actor.userId, "Authenticated user id is invalid.");

    if (files.length === 0) {
      throw new ValidationError("At least one face enrollment image is required.");
    }

    await this.ensureStudentExists(studentObjectId);

    const enrollment = await this.faceEnrollments.findByStudentId(studentObjectId);

    if (!enrollment) {
      throw new NotFoundError("Face enrollment was not found for this student.");
    }

    const processedImages = await this.preprocessEnrollmentImages(files);

    const storedProcessedImages = await this.storeFaceEnrollmentImages(studentId, processedImages);
    const storedImages = storedProcessedImages.map((image) => image.imagePath);
    const embeddings = await this.generateEmbeddingRecords(
      this.getObjectId(enrollment._id),
      studentObjectId,
      storedProcessedImages
    );
    const savedEmbeddings = await this.createEmbeddings(embeddings);
    const nextImages = [...enrollment.faceImages, ...storedImages];
    const updatedEnrollment = await this.updateEnrollment(enrollment.id, {
      faceImages: nextImages,
      totalImages: nextImages.length,
      enrollmentStatus: nextImages.length >= enrollment.requiredImages ? "COMPLETED" : "IN_PROGRESS",
      embeddingGenerated: savedEmbeddings.length > 0 || enrollment.embeddingGenerated,
      embeddingVersion: savedEmbeddings.at(0)?.modelIdentifier ?? enrollment.embeddingVersion,
      lastEnrolledAt: new Date(),
      updatedBy: actorObjectId
    });

    if (!updatedEnrollment) {
      throw new NotFoundError("Face enrollment was not found.");
    }

    return {
      uploadedImages: storedImages,
      faceEnrollment: this.toResponse(updatedEnrollment),
      embeddings: savedEmbeddings.map((embedding) => this.toEmbeddingResponse(embedding))
    };
  }

  async generateEmbeddings(id: string, actor: FaceEnrollmentActor): Promise<GenerateFaceEmbeddingsResponse> {
    this.assertValidId(id, "Face enrollment id is invalid.");
    const actorObjectId = this.toObjectId(actor.userId, "Authenticated user id is invalid.");
    const enrollment = await this.faceEnrollments.findById(id);

    if (!enrollment) {
      throw new NotFoundError("Face enrollment was not found.");
    }

    if (enrollment.faceImages.length === 0) {
      throw new ValidationError("Face enrollment does not have any processed face images.");
    }

    const faceEnrollmentId = this.getObjectId(enrollment._id);
    const existingImagePaths = new Set(await this.faceEnrollments.findEmbeddedImagePaths(faceEnrollmentId));
    const missingImagePaths = enrollment.faceImages.filter((imagePath) => !existingImagePaths.has(imagePath));

    if (missingImagePaths.length === 0) {
      const existingEmbeddings = await this.faceEnrollments.findEmbeddingsByEnrollmentId(faceEnrollmentId);

      return {
        generated: 0,
        embeddings: existingEmbeddings.map((embedding) => this.toEmbeddingResponse(embedding)),
        faceEnrollment: this.toResponse(enrollment)
      };
    }

    const storedImages = await this.readStoredProcessedImages(missingImagePaths);
    const embeddingRecords = await this.generateEmbeddingRecords(
      faceEnrollmentId,
      this.getObjectId(enrollment.studentId),
      storedImages
    );
    const savedEmbeddings = await this.createEmbeddings(embeddingRecords);
    const updatedEnrollment = await this.updateEnrollment(enrollment.id, {
      embeddingGenerated: true,
      embeddingVersion: savedEmbeddings.at(0)?.modelIdentifier ?? enrollment.embeddingVersion,
      updatedBy: actorObjectId
    });

    if (!updatedEnrollment) {
      throw new NotFoundError("Face enrollment was not found.");
    }

    return {
      generated: savedEmbeddings.length,
      embeddings: savedEmbeddings.map((embedding) => this.toEmbeddingResponse(embedding)),
      faceEnrollment: this.toResponse(updatedEnrollment)
    };
  }

  async findEmbeddings(id: string, actor: FaceEnrollmentActor): Promise<FaceEmbeddingListResponse> {
    this.assertValidId(id, "Face enrollment id is invalid.");
    const enrollment = await this.faceEnrollments.findById(id);

    if (!enrollment) {
      throw new NotFoundError("Face enrollment was not found.");
    }

    this.ensureReadAccess(enrollment, actor);

    const embeddings = await this.faceEnrollments.findEmbeddingsByEnrollmentId(this.getObjectId(enrollment._id));

    return {
      embeddings: embeddings.map((embedding) => this.toEmbeddingResponse(embedding))
    };
  }

  private async ensureStudentExists(studentId: Types.ObjectId): Promise<void> {
    const studentExists = await this.faceEnrollments.studentExists(studentId);

    if (!studentExists) {
      throw new NotFoundError("Student was not found.");
    }
  }

  private async ensureStudentEnrollmentIsAvailable(studentId: Types.ObjectId): Promise<void> {
    const existingEnrollment = await this.faceEnrollments.findByStudentId(studentId);

    if (existingEnrollment) {
      throw new ConflictError("A face enrollment already exists for this student.");
    }
  }

  private async createEnrollment(input: CreateFaceEnrollmentRecord): Promise<FaceEnrollmentDocument> {
    try {
      return await this.faceEnrollments.create(input);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictError("A face enrollment already exists for this student.");
      }

      throw error;
    }
  }

  private async updateEnrollment(
    id: string,
    input: UpdateFaceEnrollmentRecord
  ): Promise<FaceEnrollmentDocument | null> {
    try {
      return await this.faceEnrollments.update(id, input);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictError("A face enrollment already exists for this student.");
      }

      throw error;
    }
  }

  private normalizeCreateInput(input: CreateFaceEnrollmentRequest): NormalizedFaceEnrollmentCreate {
    const faceImages = this.normalizeFaceImages(input.faceImages);

    return {
      studentId: this.toObjectId(input.studentId, "Student id is invalid."),
      enrollmentStatus: this.normalizeEnrollmentStatus(input.enrollmentStatus),
      faceImages,
      totalImages: this.normalizeTotalImages(input.totalImages, faceImages),
      requiredImages: this.normalizeRequiredImages(input.requiredImages),
      embeddingGenerated: input.embeddingGenerated ?? false,
      embeddingVersion: this.normalizeOptionalString(input.embeddingVersion) ?? "",
      lastEnrolledAt: this.normalizeOptionalDate(input.lastEnrolledAt),
      notes: this.normalizeOptionalString(input.notes)
    };
  }

  private async preprocessEnrollmentImages(files: Express.Multer.File[]): Promise<ProcessedFaceImage[]> {
    const processedImages: ProcessedFaceImage[] = [];

    for (const file of files) {
      processedImages.push(await this.detectionClient.preprocessFace(file));
    }

    return processedImages;
  }

  private async storeFaceEnrollmentImages(studentId: string, images: ProcessedFaceImage[]): Promise<StoredProcessedFaceImage[]> {
    const uploadRoot = path.resolve(env.UPLOAD_DIR, "face-enrollments", studentId);
    await mkdir(uploadRoot, { recursive: true });

    const storedImages: StoredProcessedFaceImage[] = [];

    for (const image of images) {
      const filename = `${randomUUID()}${this.getProcessedImageExtension(image)}`;
      const absolutePath = path.join(uploadRoot, filename);
      await writeFile(absolutePath, image.buffer);
      storedImages.push({
        ...image,
        imagePath: this.toStoredImagePath(studentId, filename)
      });
    }

    return storedImages;
  }

  private async readStoredProcessedImages(imagePaths: string[]): Promise<StoredProcessedFaceImage[]> {
    const storedImages: StoredProcessedFaceImage[] = [];

    for (const imagePath of imagePaths) {
      const absolutePath = this.resolveStoredImagePath(imagePath);
      const buffer = await readFile(absolutePath);

      storedImages.push({
        buffer,
        mimeType: "image/jpeg",
        imagePath
      });
    }

    return storedImages;
  }

  private async generateEmbeddingRecords(
    faceEnrollmentId: Types.ObjectId,
    studentId: Types.ObjectId,
    images: StoredProcessedFaceImage[]
  ): Promise<CreateFaceEmbeddingRecord[]> {
    const embeddingRecords: CreateFaceEmbeddingRecord[] = [];

    for (const image of images) {
      const generatedEmbedding = await this.embeddingClient.generateEmbedding(image, path.basename(image.imagePath));
      this.validateGeneratedEmbedding(generatedEmbedding);

      embeddingRecords.push({
        studentId,
        faceEnrollmentId,
        imagePath: image.imagePath,
        embedding: generatedEmbedding.embedding,
        modelIdentifier: generatedEmbedding.modelIdentifier
      });
    }

    return embeddingRecords;
  }

  private async createEmbeddings(embeddings: CreateFaceEmbeddingRecord[]): Promise<FaceEmbeddingDocument[]> {
    try {
      return await this.faceEnrollments.createEmbeddings(embeddings);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictError("A face embedding already exists for this enrollment image.");
      }

      throw error;
    }
  }

  private validateGeneratedEmbedding(generatedEmbedding: GeneratedFaceEmbedding): void {
    if (generatedEmbedding.dimension !== FACE_EMBEDDING_DIMENSION) {
      throw new ValidationError("Face embedding must be exactly 512 dimensions.");
    }

    if (generatedEmbedding.embedding.length !== FACE_EMBEDDING_DIMENSION) {
      throw new ValidationError("Face embedding vector must be exactly 512 dimensions.");
    }

    if (!generatedEmbedding.embedding.every((value) => Number.isFinite(value))) {
      throw new ValidationError("Face embedding vector contains invalid values.");
    }

    const norm = Math.sqrt(generatedEmbedding.embedding.reduce((sum, value) => sum + value * value, 0));

    if (Math.abs(norm - 1) > EMBEDDING_NORMALIZATION_TOLERANCE) {
      throw new ValidationError("Face embedding vector must be normalized.");
    }

    if (!generatedEmbedding.modelIdentifier.trim()) {
      throw new ValidationError("Face embedding model identifier is required.");
    }
  }

  private resolveStoredImagePath(imagePath: string): string {
    const uploadRoot = path.resolve(env.UPLOAD_DIR);
    const absolutePath = path.resolve(imagePath);

    if (absolutePath !== uploadRoot && !absolutePath.startsWith(`${uploadRoot}${path.sep}`)) {
      throw new ValidationError("Stored face image path is invalid.");
    }

    return absolutePath;
  }

  private getProcessedImageExtension(image: ProcessedFaceImage): string {
    return image.mimeType === "image/jpeg" ? ".jpg" : ".jpg";
  }

  private toStoredImagePath(studentId: string, filename: string): string {
    return path.posix.join(env.UPLOAD_DIR.replace(/\\/g, "/"), "face-enrollments", studentId, filename);
  }

  private normalizeUpdateInput(input: UpdateFaceEnrollmentRequest): NormalizedFaceEnrollmentUpdate {
    const normalizedInput: NormalizedFaceEnrollmentUpdate = {};

    if (input.studentId !== undefined) {
      normalizedInput.studentId = this.toObjectId(input.studentId, "Student id is invalid.");
    }

    if (input.enrollmentStatus !== undefined) {
      normalizedInput.enrollmentStatus = this.normalizeEnrollmentStatus(input.enrollmentStatus);
    }

    if (input.faceImages !== undefined) {
      normalizedInput.faceImages = this.normalizeFaceImages(input.faceImages);
    }

    if (input.totalImages !== undefined) {
      normalizedInput.totalImages = this.normalizeTotalImages(input.totalImages, input.faceImages);
    }

    if (input.requiredImages !== undefined) {
      normalizedInput.requiredImages = this.normalizeRequiredImages(input.requiredImages);
    }

    if (input.embeddingGenerated !== undefined) {
      normalizedInput.embeddingGenerated = input.embeddingGenerated;
    }

    if (input.embeddingVersion !== undefined) {
      normalizedInput.embeddingVersion = this.normalizeOptionalString(input.embeddingVersion) ?? "";
    }

    if (input.lastEnrolledAt !== undefined) {
      normalizedInput.lastEnrolledAt = this.normalizeOptionalDate(input.lastEnrolledAt);
    }

    if (input.notes !== undefined) {
      normalizedInput.notes = this.normalizeOptionalString(input.notes);
    }

    return normalizedInput;
  }

  private normalizeEnrollmentStatus(status: FaceEnrollmentStatus = "NOT_STARTED"): FaceEnrollmentStatus {
    if (!faceEnrollmentStatuses.includes(status)) {
      throw new ValidationError("Enrollment status is invalid.");
    }

    return status;
  }

  private normalizeFaceImages(faceImages: string[] = []): string[] {
    return faceImages.map((image) => this.requiredString(image, "Face image path cannot be empty."));
  }

  private normalizeTotalImages(value: number | undefined, faceImages: string[] | undefined): number {
    const totalImages = value ?? faceImages?.length ?? 0;

    if (!Number.isInteger(totalImages) || totalImages < 0) {
      throw new ValidationError("Total images must be a non-negative integer.");
    }

    return totalImages;
  }

  private normalizeRequiredImages(value = 10): number {
    if (!Number.isInteger(value) || value < 1) {
      throw new ValidationError("Required images must be a positive integer.");
    }

    return value;
  }

  private normalizeOptionalString(value?: string): string | undefined {
    if (value === undefined) {
      return undefined;
    }

    const normalizedValue = value.trim();

    return normalizedValue.length > 0 ? normalizedValue : undefined;
  }

  private normalizeOptionalDate(value?: string | null): Date | null {
    if (value === undefined || value === null) {
      return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new ValidationError("Last enrolled at must be a valid date.");
    }

    return date;
  }

  private requiredString(value: string, message: string): string {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      throw new ValidationError(message);
    }

    return normalizedValue;
  }

  private ensureReadAccess(enrollment: FaceEnrollmentDocument, actor: FaceEnrollmentActor): void {
    if (actor.role !== "student") {
      return;
    }

    const student = this.getPopulatedStudent(enrollment.studentId);

    if (student.email !== actor.email.toLowerCase()) {
      throw new AppError("You are not authorized to access this resource.", 403, { code: "AUTHORIZATION_ERROR" });
    }
  }

  private assertValidId(id: string, errorMessage: string): void {
    if (!isValidObjectId(id)) {
      throw new ValidationError(errorMessage);
    }
  }

  private toObjectId(id: string, errorMessage: string): Types.ObjectId {
    if (!isValidObjectId(id)) {
      throw new ValidationError(errorMessage);
    }

    return new Types.ObjectId(id);
  }

  private getObjectId(value: Types.ObjectId | object): Types.ObjectId {
    if (value instanceof Types.ObjectId) {
      return value;
    }

    const populated = value as { _id?: Types.ObjectId };

    if (populated._id instanceof Types.ObjectId) {
      return populated._id;
    }

    throw new ValidationError("Face enrollment reference is invalid.");
  }

  private toResponse(enrollment: FaceEnrollmentDocument): FaceEnrollmentResponse {
    return {
      id: enrollment.id,
      student: this.toStudentResponse(this.getPopulatedStudent(enrollment.studentId)),
      enrollmentStatus: enrollment.enrollmentStatus,
      imageCount: enrollment.faceImages.length,
      faceImages: enrollment.faceImages,
      totalImages: enrollment.totalImages,
      requiredImages: enrollment.requiredImages,
      embeddingGenerated: enrollment.embeddingGenerated,
      embeddingStatus: enrollment.embeddingGenerated ? "GENERATED" : "NOT_GENERATED",
      embeddingVersion: enrollment.embeddingVersion,
      lastEnrolledAt: enrollment.lastEnrolledAt ? enrollment.lastEnrolledAt.toISOString() : null,
      notes: enrollment.notes,
      createdBy: enrollment.createdBy.toString(),
      updatedBy: enrollment.updatedBy.toString(),
      createdAt: enrollment.createdAt.toISOString(),
      updatedAt: enrollment.updatedAt.toISOString()
    };
  }

  private toEmbeddingResponse(embedding: FaceEmbeddingDocument): FaceEmbeddingResponse {
    return {
      id: embedding.id,
      studentId: embedding.studentId.toString(),
      faceEnrollmentId: embedding.faceEnrollmentId.toString(),
      imagePath: embedding.imagePath,
      embedding: embedding.embedding,
      dimension: embedding.embedding.length,
      modelIdentifier: embedding.modelIdentifier,
      createdAt: embedding.createdAt.toISOString()
    };
  }

  private getPopulatedStudent(value: unknown): StudentDocument {
    if (typeof value === "object" && value !== null && "enrollmentNumber" in value) {
      return value as StudentDocument;
    }

    throw new ValidationError("Face enrollment student reference is not populated.");
  }

  private toStudentResponse(student: StudentDocument & Student): FaceEnrollmentStudentResponse {
    return {
      id: student.id,
      name: student.name,
      enrollmentNumber: student.enrollmentNumber,
      email: student.email,
      department: student.department,
      semester: student.semester,
      section: student.section,
      faceEnrolled: student.faceEnrolled
    };
  }

  private isDuplicateKeyError(error: unknown): error is { code: number } {
    return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
  }
}

export const faceEnrollmentService = new FaceEnrollmentService();
