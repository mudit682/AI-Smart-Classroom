import { isValidObjectId, Types } from "mongoose";
import { ConflictError, NotFoundError, ValidationError } from "../../../shared/errors/index.js";
import type {
  ClassroomListResponse,
  ClassroomResponse,
  CreateClassroomRequest,
  DeleteClassroomResponse,
  UpdateClassroomRequest
} from "../dtos/classroom.dto.js";
import {
  classroomSections,
  classroomStatuses,
  type ClassroomDocument,
  type ClassroomSection,
  type ClassroomStatus
} from "../models/classroom.model.js";
import { classroomRepository, type ClassroomUniquenessCriteria } from "../repositories/classroom.repository.js";

const academicYearPattern = /^\d{4}-\d{2}$/;

export class ClassroomService {
  constructor(private readonly classrooms = classroomRepository) {}

  async create(input: CreateClassroomRequest, actorId: string): Promise<ClassroomResponse> {
    const normalizedInput = this.normalizeCreateInput(input);
    const actorObjectId = this.toObjectId(actorId, "Authenticated user id is invalid.");

    await this.ensureClassroomIsAvailable(normalizedInput);

    const classroom = await this.createClassroom({
      ...normalizedInput,
      createdBy: actorObjectId,
      updatedBy: actorObjectId
    });

    return this.toResponse(classroom);
  }

  async findAll(): Promise<ClassroomListResponse> {
    const classrooms = await this.classrooms.findAll();

    return {
      classrooms: classrooms.map((classroom) => this.toResponse(classroom))
    };
  }

  async findById(id: string): Promise<ClassroomResponse> {
    this.assertValidId(id);

    const classroom = await this.classrooms.findById(id);

    if (!classroom) {
      throw new NotFoundError("Classroom was not found.");
    }

    return this.toResponse(classroom);
  }

  async update(id: string, input: UpdateClassroomRequest, actorId: string): Promise<ClassroomResponse> {
    this.assertValidId(id);

    const normalizedInput = this.normalizeUpdateInput(input);
    const actorObjectId = this.toObjectId(actorId, "Authenticated user id is invalid.");
    const existingClassroom = await this.classrooms.findById(id);

    if (!existingClassroom) {
      throw new NotFoundError("Classroom was not found.");
    }

    const nextUniqueCriteria = this.mergeUniqueCriteria(existingClassroom, normalizedInput);

    if (this.hasUniqueCriteriaChanged(existingClassroom, nextUniqueCriteria)) {
      await this.ensureClassroomIsAvailable(nextUniqueCriteria);
    }

    const updatedClassroom = await this.updateClassroom(id, {
      ...normalizedInput,
      updatedBy: actorObjectId
    });

    if (!updatedClassroom) {
      throw new NotFoundError("Classroom was not found.");
    }

    return this.toResponse(updatedClassroom);
  }

  async delete(id: string): Promise<DeleteClassroomResponse> {
    this.assertValidId(id);

    const deleted = await this.classrooms.delete(id);

    if (!deleted) {
      throw new NotFoundError("Classroom was not found.");
    }

    return {
      message: "Classroom deleted successfully."
    };
  }

  private async ensureClassroomIsAvailable(criteria: ClassroomUniquenessCriteria): Promise<void> {
    const existingClassroom = await this.classrooms.findByUniqueCriteria(criteria);

    if (existingClassroom) {
      throw new ConflictError("A classroom already exists for this department, semester, section, and academic year.");
    }
  }

  private async createClassroom(input: {
    name: string;
    department: string;
    semester: number;
    section: ClassroomSection;
    academicYear: string;
    capacity: number;
    status: ClassroomStatus;
    createdBy: Types.ObjectId;
    updatedBy: Types.ObjectId;
  }): Promise<ClassroomDocument> {
    try {
      return await this.classrooms.create(input);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictError("A classroom already exists for this department, semester, section, and academic year.");
      }

      throw error;
    }
  }

  private async updateClassroom(
    id: string,
    input: UpdateClassroomRequest & {
      updatedBy: Types.ObjectId;
    }
  ): Promise<ClassroomDocument | null> {
    try {
      return await this.classrooms.update(id, input);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictError("A classroom already exists for this department, semester, section, and academic year.");
      }

      throw error;
    }
  }

  private normalizeCreateInput(input: CreateClassroomRequest): Required<CreateClassroomRequest> {
    return {
      name: this.requiredString(input.name, "Name is required."),
      department: this.requiredString(input.department, "Department is required."),
      semester: this.requiredSemester(input.semester),
      section: this.requiredSection(input.section),
      academicYear: this.requiredAcademicYear(input.academicYear),
      capacity: this.requiredCapacity(input.capacity),
      status: this.normalizeStatus(input.status)
    };
  }

  private normalizeUpdateInput(input: UpdateClassroomRequest): UpdateClassroomRequest {
    const normalizedInput: UpdateClassroomRequest = {};

    if (input.name !== undefined) {
      normalizedInput.name = this.requiredString(input.name, "Name cannot be empty.");
    }

    if (input.department !== undefined) {
      normalizedInput.department = this.requiredString(input.department, "Department cannot be empty.");
    }

    if (input.semester !== undefined) {
      normalizedInput.semester = this.requiredSemester(input.semester);
    }

    if (input.section !== undefined) {
      normalizedInput.section = this.requiredSection(input.section);
    }

    if (input.academicYear !== undefined) {
      normalizedInput.academicYear = this.requiredAcademicYear(input.academicYear);
    }

    if (input.capacity !== undefined) {
      normalizedInput.capacity = this.requiredCapacity(input.capacity);
    }

    if (input.status !== undefined) {
      normalizedInput.status = this.normalizeStatus(input.status);
    }

    return normalizedInput;
  }

  private mergeUniqueCriteria(classroom: ClassroomDocument, input: UpdateClassroomRequest): ClassroomUniquenessCriteria {
    return {
      department: input.department ?? classroom.department,
      semester: input.semester ?? classroom.semester,
      section: input.section ?? classroom.section,
      academicYear: input.academicYear ?? classroom.academicYear
    };
  }

  private hasUniqueCriteriaChanged(classroom: ClassroomDocument, criteria: ClassroomUniquenessCriteria): boolean {
    return (
      classroom.department !== criteria.department ||
      classroom.semester !== criteria.semester ||
      classroom.section !== criteria.section ||
      classroom.academicYear !== criteria.academicYear
    );
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

  private requiredSection(value: ClassroomSection): ClassroomSection {
    const section = this.requiredString(value, "Section is required.").toUpperCase();

    if (!classroomSections.includes(section as ClassroomSection)) {
      throw new ValidationError("Section must be A, B, C, or D.");
    }

    return section as ClassroomSection;
  }

  private requiredAcademicYear(value: string): string {
    const academicYear = this.requiredString(value, "Academic year is required.");

    if (!academicYearPattern.test(academicYear)) {
      throw new ValidationError("Academic year must use YYYY-YY format.");
    }

    return academicYear;
  }

  private requiredCapacity(value: number): number {
    if (!Number.isInteger(value) || value < 10 || value > 300) {
      throw new ValidationError("Capacity must be an integer between 10 and 300.");
    }

    return value;
  }

  private normalizeStatus(status: ClassroomStatus = "ACTIVE"): ClassroomStatus {
    if (!classroomStatuses.includes(status)) {
      throw new ValidationError("Status must be ACTIVE or INACTIVE.");
    }

    return status;
  }

  private assertValidId(id: string): void {
    if (!isValidObjectId(id)) {
      throw new ValidationError("Classroom id is invalid.");
    }
  }

  private toObjectId(id: string, errorMessage: string): Types.ObjectId {
    if (!isValidObjectId(id)) {
      throw new ValidationError(errorMessage);
    }

    return new Types.ObjectId(id);
  }

  private toResponse(classroom: ClassroomDocument): ClassroomResponse {
    return {
      id: classroom.id,
      name: classroom.name,
      department: classroom.department,
      semester: classroom.semester,
      section: classroom.section,
      academicYear: classroom.academicYear,
      capacity: classroom.capacity,
      status: classroom.status,
      createdBy: classroom.createdBy.toString(),
      updatedBy: classroom.updatedBy.toString(),
      createdAt: classroom.createdAt.toISOString(),
      updatedAt: classroom.updatedAt.toISOString()
    };
  }

  private isDuplicateKeyError(error: unknown): error is { code: number } {
    return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
  }
}

export const classroomService = new ClassroomService();

