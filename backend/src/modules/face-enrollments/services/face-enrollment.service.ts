import { isValidObjectId, Types } from "mongoose";
import { AppError, ConflictError, NotFoundError, ValidationError } from "../../../shared/errors/index.js";
import type { Student, StudentDocument } from "../../students/models/student.model.js";
import type {
  CreateFaceEnrollmentRequest,
  DeleteFaceEnrollmentResponse,
  FaceEnrollmentActor,
  FaceEnrollmentListResponse,
  FaceEnrollmentResponse,
  FaceEnrollmentStudentResponse,
  UpdateFaceEnrollmentRequest
} from "../dtos/face-enrollment.dto.js";
import {
  faceEnrollmentStatuses,
  type FaceEnrollmentDocument,
  type FaceEnrollmentStatus
} from "../models/face-enrollment.model.js";
import {
  faceEnrollmentRepository,
  type CreateFaceEnrollmentRecord,
  type UpdateFaceEnrollmentRecord
} from "../repositories/face-enrollment.repository.js";

type NormalizedFaceEnrollmentCreate = Omit<CreateFaceEnrollmentRecord, "createdBy" | "updatedBy">;
type NormalizedFaceEnrollmentUpdate = Omit<UpdateFaceEnrollmentRecord, "updatedBy">;

export class FaceEnrollmentService {
  constructor(private readonly faceEnrollments = faceEnrollmentRepository) {}

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

    const deleted = await this.faceEnrollments.delete(id);

    if (!deleted) {
      throw new NotFoundError("Face enrollment was not found.");
    }

    return {
      message: "Face enrollment deleted successfully."
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
