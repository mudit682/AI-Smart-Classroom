import { isValidObjectId, Types } from "mongoose";
import { ConflictError, NotFoundError, ValidationError } from "../../../shared/errors/index.js";
import type { CreateStudentRequest, StudentListResponse, StudentResponse, UpdateStudentRequest } from "../dtos/student.dto.js";
import type { StudentDocument } from "../models/student.model.js";
import { studentRepository } from "../repositories/student.repository.js";

export class StudentService {
  constructor(private readonly students = studentRepository) {}

  async create(input: CreateStudentRequest, actorId: string): Promise<StudentResponse> {
    const normalizedInput = this.normalizeCreateInput(input);
    const actorObjectId = this.toObjectId(actorId, "Authenticated user id is invalid.");

    await this.ensureEnrollmentNumberIsAvailable(normalizedInput.enrollmentNumber);
    await this.ensureEmailIsAvailable(normalizedInput.email);

    const student = await this.createStudent({
      ...normalizedInput,
      createdBy: actorObjectId,
      updatedBy: actorObjectId
    });

    return this.toResponse(student);
  }

  async findAll(): Promise<StudentListResponse> {
    const students = await this.students.findAll();

    return {
      students: students.map((student) => this.toResponse(student))
    };
  }

  async findById(id: string): Promise<StudentResponse> {
    this.assertValidId(id);

    const student = await this.students.findById(id);

    if (!student) {
      throw new NotFoundError("Student was not found.");
    }

    return this.toResponse(student);
  }

  async update(id: string, input: UpdateStudentRequest, actorId: string): Promise<StudentResponse> {
    this.assertValidId(id);

    const normalizedInput = this.normalizeUpdateInput(input);
    const actorObjectId = this.toObjectId(actorId, "Authenticated user id is invalid.");
    const existingStudent = await this.students.findById(id);

    if (!existingStudent) {
      throw new NotFoundError("Student was not found.");
    }

    if (normalizedInput.enrollmentNumber && normalizedInput.enrollmentNumber !== existingStudent.enrollmentNumber) {
      await this.ensureEnrollmentNumberIsAvailable(normalizedInput.enrollmentNumber);
    }

    if (normalizedInput.email && normalizedInput.email !== existingStudent.email) {
      await this.ensureEmailIsAvailable(normalizedInput.email);
    }

    const updatedStudent = await this.updateStudent(id, {
      ...normalizedInput,
      updatedBy: actorObjectId
    });

    if (!updatedStudent) {
      throw new NotFoundError("Student was not found.");
    }

    return this.toResponse(updatedStudent);
  }

  async delete(id: string): Promise<void> {
    this.assertValidId(id);

    const deleted = await this.students.delete(id);

    if (!deleted) {
      throw new NotFoundError("Student was not found.");
    }
  }

  private async ensureEnrollmentNumberIsAvailable(enrollmentNumber: string): Promise<void> {
    const existingStudent = await this.students.findByEnrollmentNumber(enrollmentNumber);

    if (existingStudent) {
      throw new ConflictError("A student with this enrollment number already exists.");
    }
  }

  private async ensureEmailIsAvailable(email: string): Promise<void> {
    const existingStudent = await this.students.findByEmail(email);

    if (existingStudent) {
      throw new ConflictError("A student with this email already exists.");
    }
  }

  private async createStudent(input: {
    name: string;
    enrollmentNumber: string;
    email: string;
    department: string;
    semester: number;
    section: string;
    createdBy: Types.ObjectId;
    updatedBy: Types.ObjectId;
  }): Promise<StudentDocument> {
    try {
      return await this.students.create(input);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictError("A student with this enrollment number or email already exists.");
      }

      throw error;
    }
  }

  private async updateStudent(
    id: string,
    input: UpdateStudentRequest & {
      updatedBy: Types.ObjectId;
    }
  ): Promise<StudentDocument | null> {
    try {
      return await this.students.update(id, input);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictError("A student with this enrollment number or email already exists.");
      }

      throw error;
    }
  }

  private normalizeCreateInput(input: CreateStudentRequest): CreateStudentRequest {
    return {
      name: this.requiredString(input.name, "Name is required."),
      enrollmentNumber: this.requiredString(input.enrollmentNumber, "Enrollment number is required.").toUpperCase(),
      email: this.requiredEmail(input.email),
      department: this.requiredString(input.department, "Department is required."),
      semester: this.requiredSemester(input.semester),
      section: this.requiredString(input.section, "Section is required.").toUpperCase()
    };
  }

  private normalizeUpdateInput(input: UpdateStudentRequest): UpdateStudentRequest {
    const normalizedInput: UpdateStudentRequest = {};

    if (input.name !== undefined) {
      normalizedInput.name = this.requiredString(input.name, "Name cannot be empty.");
    }

    if (input.enrollmentNumber !== undefined) {
      normalizedInput.enrollmentNumber = this.requiredString(input.enrollmentNumber, "Enrollment number cannot be empty.").toUpperCase();
    }

    if (input.email !== undefined) {
      normalizedInput.email = this.requiredEmail(input.email);
    }

    if (input.department !== undefined) {
      normalizedInput.department = this.requiredString(input.department, "Department cannot be empty.");
    }

    if (input.semester !== undefined) {
      normalizedInput.semester = this.requiredSemester(input.semester);
    }

    if (input.section !== undefined) {
      normalizedInput.section = this.requiredString(input.section, "Section cannot be empty.").toUpperCase();
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

  private requiredSemester(value: number): number {
    if (!Number.isInteger(value) || value < 1 || value > 12) {
      throw new ValidationError("Semester must be an integer between 1 and 12.");
    }

    return value;
  }

  private assertValidId(id: string): void {
    if (!isValidObjectId(id)) {
      throw new ValidationError("Student id is invalid.");
    }
  }

  private toObjectId(id: string, errorMessage: string): Types.ObjectId {
    if (!isValidObjectId(id)) {
      throw new ValidationError(errorMessage);
    }

    return new Types.ObjectId(id);
  }

  private toResponse(student: StudentDocument): StudentResponse {
    return {
      id: student.id,
      name: student.name,
      enrollmentNumber: student.enrollmentNumber,
      email: student.email,
      department: student.department,
      semester: student.semester,
      section: student.section,
      faceEnrolled: student.faceEnrolled,
      createdBy: student.createdBy.toString(),
      updatedBy: student.updatedBy.toString(),
      createdAt: student.createdAt.toISOString(),
      updatedAt: student.updatedAt.toISOString()
    };
  }

  private isDuplicateKeyError(error: unknown): error is { code: number } {
    return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
  }
}

export const studentService = new StudentService();
