import { isValidObjectId, Types } from "mongoose";
import { ConflictError, NotFoundError, ValidationError } from "../../../shared/errors/index.js";
import type {
  CreateTeacherRequest,
  DeleteTeacherResponse,
  TeacherListResponse,
  TeacherResponse,
  UpdateTeacherRequest
} from "../dtos/teacher.dto.js";
import { teacherStatuses, type TeacherDocument, type TeacherStatus } from "../models/teacher.model.js";
import { teacherRepository } from "../repositories/teacher.repository.js";

export class TeacherService {
  constructor(private readonly teachers = teacherRepository) {}

  async create(input: CreateTeacherRequest, actorId: string): Promise<TeacherResponse> {
    const normalizedInput = this.normalizeCreateInput(input);
    const actorObjectId = this.toObjectId(actorId, "Authenticated user id is invalid.");

    await this.ensureEmployeeIdIsAvailable(normalizedInput.employeeId);
    await this.ensureEmailIsAvailable(normalizedInput.email);

    const teacher = await this.createTeacher({
      ...normalizedInput,
      createdBy: actorObjectId,
      updatedBy: actorObjectId
    });

    return this.toResponse(teacher);
  }

  async findAll(): Promise<TeacherListResponse> {
    const teachers = await this.teachers.findAll();

    return {
      teachers: teachers.map((teacher) => this.toResponse(teacher))
    };
  }

  async findById(id: string): Promise<TeacherResponse> {
    this.assertValidId(id);

    const teacher = await this.teachers.findById(id);

    if (!teacher) {
      throw new NotFoundError("Teacher was not found.");
    }

    return this.toResponse(teacher);
  }

  async update(id: string, input: UpdateTeacherRequest, actorId: string): Promise<TeacherResponse> {
    this.assertValidId(id);

    const normalizedInput = this.normalizeUpdateInput(input);
    const actorObjectId = this.toObjectId(actorId, "Authenticated user id is invalid.");
    const existingTeacher = await this.teachers.findById(id);

    if (!existingTeacher) {
      throw new NotFoundError("Teacher was not found.");
    }

    if (normalizedInput.employeeId && normalizedInput.employeeId !== existingTeacher.employeeId) {
      await this.ensureEmployeeIdIsAvailable(normalizedInput.employeeId);
    }

    if (normalizedInput.email && normalizedInput.email !== existingTeacher.email) {
      await this.ensureEmailIsAvailable(normalizedInput.email);
    }

    const updatedTeacher = await this.updateTeacher(id, {
      ...normalizedInput,
      updatedBy: actorObjectId
    });

    if (!updatedTeacher) {
      throw new NotFoundError("Teacher was not found.");
    }

    return this.toResponse(updatedTeacher);
  }

  async delete(id: string): Promise<DeleteTeacherResponse> {
    this.assertValidId(id);

    const deleted = await this.teachers.delete(id);

    if (!deleted) {
      throw new NotFoundError("Teacher was not found.");
    }

    return {
      message: "Teacher deleted successfully."
    };
  }

  private async ensureEmployeeIdIsAvailable(employeeId: string): Promise<void> {
    const existingTeacher = await this.teachers.findByEmployeeId(employeeId);

    if (existingTeacher) {
      throw new ConflictError("A teacher with this employee id already exists.");
    }
  }

  private async ensureEmailIsAvailable(email: string): Promise<void> {
    const existingTeacher = await this.teachers.findByEmail(email);

    if (existingTeacher) {
      throw new ConflictError("A teacher with this email already exists.");
    }
  }

  private async createTeacher(input: {
    employeeId: string;
    name: string;
    email: string;
    department: string;
    designation: string;
    status: TeacherStatus;
    createdBy: Types.ObjectId;
    updatedBy: Types.ObjectId;
  }): Promise<TeacherDocument> {
    try {
      return await this.teachers.create(input);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictError("A teacher with this employee id or email already exists.");
      }

      throw error;
    }
  }

  private async updateTeacher(
    id: string,
    input: UpdateTeacherRequest & {
      updatedBy: Types.ObjectId;
    }
  ): Promise<TeacherDocument | null> {
    try {
      return await this.teachers.update(id, input);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictError("A teacher with this employee id or email already exists.");
      }

      throw error;
    }
  }

  private normalizeCreateInput(input: CreateTeacherRequest): Required<CreateTeacherRequest> {
    return {
      employeeId: this.requiredString(input.employeeId, "Employee id is required.").toUpperCase(),
      name: this.requiredString(input.name, "Name is required."),
      email: this.requiredEmail(input.email),
      department: this.requiredString(input.department, "Department is required."),
      designation: this.requiredString(input.designation, "Designation is required."),
      status: this.normalizeStatus(input.status)
    };
  }

  private normalizeUpdateInput(input: UpdateTeacherRequest): UpdateTeacherRequest {
    const normalizedInput: UpdateTeacherRequest = {};

    if (input.employeeId !== undefined) {
      normalizedInput.employeeId = this.requiredString(input.employeeId, "Employee id cannot be empty.").toUpperCase();
    }

    if (input.name !== undefined) {
      normalizedInput.name = this.requiredString(input.name, "Name cannot be empty.");
    }

    if (input.email !== undefined) {
      normalizedInput.email = this.requiredEmail(input.email);
    }

    if (input.department !== undefined) {
      normalizedInput.department = this.requiredString(input.department, "Department cannot be empty.");
    }

    if (input.designation !== undefined) {
      normalizedInput.designation = this.requiredString(input.designation, "Designation cannot be empty.");
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

  private requiredEmail(value: string): string {
    const email = this.requiredString(value, "Email is required.").toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ValidationError("Email must be a valid email address.");
    }

    return email;
  }

  private normalizeStatus(status: TeacherStatus = "ACTIVE"): TeacherStatus {
    if (!teacherStatuses.includes(status)) {
      throw new ValidationError("Status must be ACTIVE or INACTIVE.");
    }

    return status;
  }

  private assertValidId(id: string): void {
    if (!isValidObjectId(id)) {
      throw new ValidationError("Teacher id is invalid.");
    }
  }

  private toObjectId(id: string, errorMessage: string): Types.ObjectId {
    if (!isValidObjectId(id)) {
      throw new ValidationError(errorMessage);
    }

    return new Types.ObjectId(id);
  }

  private toResponse(teacher: TeacherDocument): TeacherResponse {
    return {
      id: teacher.id,
      employeeId: teacher.employeeId,
      name: teacher.name,
      email: teacher.email,
      department: teacher.department,
      designation: teacher.designation,
      status: teacher.status,
      createdBy: teacher.createdBy.toString(),
      updatedBy: teacher.updatedBy.toString(),
      createdAt: teacher.createdAt.toISOString(),
      updatedAt: teacher.updatedAt.toISOString()
    };
  }

  private isDuplicateKeyError(error: unknown): error is { code: number } {
    return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
  }
}

export const teacherService = new TeacherService();

