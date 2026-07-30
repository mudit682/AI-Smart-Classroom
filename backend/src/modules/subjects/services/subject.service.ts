import { isValidObjectId, Types } from "mongoose";
import { ConflictError, NotFoundError, ValidationError } from "../../../shared/errors/index.js";
import type {
  CreateSubjectRequest,
  DeleteSubjectResponse,
  SubjectListResponse,
  SubjectResponse,
  UpdateSubjectRequest
} from "../dtos/subject.dto.js";
import { subjectStatuses, type SubjectDocument, type SubjectStatus } from "../models/subject.model.js";
import { subjectRepository } from "../repositories/subject.repository.js";

export class SubjectService {
  constructor(private readonly subjects = subjectRepository) {}

  async create(input: CreateSubjectRequest, actorId: string): Promise<SubjectResponse> {
    const normalizedInput = this.normalizeCreateInput(input);
    const actorObjectId = this.toObjectId(actorId, "Authenticated user id is invalid.");

    await this.ensureSubjectCodeIsAvailable(normalizedInput.subjectCode);

    const subject = await this.createSubject({
      ...normalizedInput,
      createdBy: actorObjectId,
      updatedBy: actorObjectId
    });

    return this.toResponse(subject);
  }

  async findAll(): Promise<SubjectListResponse> {
    const subjects = await this.subjects.findAll();

    return {
      subjects: subjects.map((subject) => this.toResponse(subject))
    };
  }

  async findById(id: string): Promise<SubjectResponse> {
    this.assertValidId(id);

    const subject = await this.subjects.findById(id);

    if (!subject) {
      throw new NotFoundError("Subject was not found.");
    }

    return this.toResponse(subject);
  }

  async update(id: string, input: UpdateSubjectRequest, actorId: string): Promise<SubjectResponse> {
    this.assertValidId(id);

    const normalizedInput = this.normalizeUpdateInput(input);
    const actorObjectId = this.toObjectId(actorId, "Authenticated user id is invalid.");
    const existingSubject = await this.subjects.findById(id);

    if (!existingSubject) {
      throw new NotFoundError("Subject was not found.");
    }

    if (normalizedInput.subjectCode && normalizedInput.subjectCode !== existingSubject.subjectCode) {
      await this.ensureSubjectCodeIsAvailable(normalizedInput.subjectCode);
    }

    const updatedSubject = await this.updateSubject(id, {
      ...normalizedInput,
      updatedBy: actorObjectId
    });

    if (!updatedSubject) {
      throw new NotFoundError("Subject was not found.");
    }

    return this.toResponse(updatedSubject);
  }

  async delete(id: string): Promise<DeleteSubjectResponse> {
    this.assertValidId(id);

    const deleted = await this.subjects.delete(id);

    if (!deleted) {
      throw new NotFoundError("Subject was not found.");
    }

    return {
      message: "Subject deleted successfully."
    };
  }

  private async ensureSubjectCodeIsAvailable(subjectCode: string): Promise<void> {
    const existingSubject = await this.subjects.findBySubjectCode(subjectCode);

    if (existingSubject) {
      throw new ConflictError("A subject with this subject code already exists.");
    }
  }

  private async createSubject(input: {
    subjectCode: string;
    name: string;
    department: string;
    semester: number;
    credits: number;
    status: SubjectStatus;
    createdBy: Types.ObjectId;
    updatedBy: Types.ObjectId;
  }): Promise<SubjectDocument> {
    try {
      return await this.subjects.create(input);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictError("A subject with this subject code already exists.");
      }

      throw error;
    }
  }

  private async updateSubject(
    id: string,
    input: UpdateSubjectRequest & {
      updatedBy: Types.ObjectId;
    }
  ): Promise<SubjectDocument | null> {
    try {
      return await this.subjects.update(id, input);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictError("A subject with this subject code already exists.");
      }

      throw error;
    }
  }

  private normalizeCreateInput(input: CreateSubjectRequest): Required<CreateSubjectRequest> {
    return {
      subjectCode: this.requiredString(input.subjectCode, "Subject code is required.").toUpperCase(),
      name: this.requiredString(input.name, "Name is required."),
      department: this.requiredString(input.department, "Department is required."),
      semester: this.requiredSemester(input.semester),
      credits: this.requiredCredits(input.credits),
      status: this.normalizeStatus(input.status)
    };
  }

  private normalizeUpdateInput(input: UpdateSubjectRequest): UpdateSubjectRequest {
    const normalizedInput: UpdateSubjectRequest = {};

    if (input.subjectCode !== undefined) {
      normalizedInput.subjectCode = this.requiredString(input.subjectCode, "Subject code cannot be empty.").toUpperCase();
    }

    if (input.name !== undefined) {
      normalizedInput.name = this.requiredString(input.name, "Name cannot be empty.");
    }

    if (input.department !== undefined) {
      normalizedInput.department = this.requiredString(input.department, "Department cannot be empty.");
    }

    if (input.semester !== undefined) {
      normalizedInput.semester = this.requiredSemester(input.semester);
    }

    if (input.credits !== undefined) {
      normalizedInput.credits = this.requiredCredits(input.credits);
    }

    if (input.status !== undefined) {
      normalizedInput.status = this.normalizeStatus(input.status);
    }

    return normalizedInput;
  }

  private requiredString(value: string, message: string): string {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      throw new ValidationError(message);
    }

    return normalizedValue;
  }

  private requiredSemester(value: number): number {
    if (!Number.isInteger(value) || value < 1 || value > 8) {
      throw new ValidationError("Semester must be an integer between 1 and 8.");
    }

    return value;
  }

  private requiredCredits(value: number): number {
    if (!Number.isInteger(value) || value < 1 || value > 6) {
      throw new ValidationError("Credits must be an integer between 1 and 6.");
    }

    return value;
  }

  private normalizeStatus(status: SubjectStatus = "ACTIVE"): SubjectStatus {
    if (!subjectStatuses.includes(status)) {
      throw new ValidationError("Status must be ACTIVE or INACTIVE.");
    }

    return status;
  }

  private assertValidId(id: string): void {
    if (!isValidObjectId(id)) {
      throw new ValidationError("Subject id is invalid.");
    }
  }

  private toObjectId(id: string, errorMessage: string): Types.ObjectId {
    if (!isValidObjectId(id)) {
      throw new ValidationError(errorMessage);
    }

    return new Types.ObjectId(id);
  }

  private toResponse(subject: SubjectDocument): SubjectResponse {
    return {
      id: subject.id,
      subjectCode: subject.subjectCode,
      name: subject.name,
      department: subject.department,
      semester: subject.semester,
      credits: subject.credits,
      status: subject.status,
      createdBy: subject.createdBy.toString(),
      updatedBy: subject.updatedBy.toString(),
      createdAt: subject.createdAt.toISOString(),
      updatedAt: subject.updatedAt.toISOString()
    };
  }

  private isDuplicateKeyError(error: unknown): error is { code: number } {
    return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
  }
}

export const subjectService = new SubjectService();

