import { isValidObjectId, Types } from "mongoose";
import { ConflictError, NotFoundError, ValidationError } from "../../../shared/errors/index.js";
import type { Classroom, ClassroomDocument } from "../../classrooms/models/classroom.model.js";
import type { Student, StudentDocument } from "../../students/models/student.model.js";
import type {
  CreateStudentEnrollmentRequest,
  DeleteStudentEnrollmentResponse,
  StudentEnrollmentClassroomResponse,
  StudentEnrollmentListResponse,
  StudentEnrollmentResponse,
  StudentEnrollmentStudentResponse,
  UpdateStudentEnrollmentRequest
} from "../dtos/student-enrollment.dto.js";
import {
  studentEnrollmentStatuses,
  type StudentEnrollmentDocument,
  type StudentEnrollmentStatus
} from "../models/student-enrollment.model.js";
import {
  studentEnrollmentRepository,
  type RollNumberUniquenessCriteria,
  type StudentEnrollmentUniquenessCriteria,
  type UpdateStudentEnrollmentRecord
} from "../repositories/student-enrollment.repository.js";

const academicYearPattern = /^\d{4}-\d{2}$/;

type NormalizedStudentEnrollmentUpdate = Partial<
  Pick<StudentEnrollmentUniquenessCriteria, "studentId" | "classroomId" | "academicYear">
> & {
  rollNumber?: string;
  status?: StudentEnrollmentStatus;
};

export class StudentEnrollmentService {
  constructor(private readonly studentEnrollments = studentEnrollmentRepository) {}

  async create(input: CreateStudentEnrollmentRequest, actorId: string): Promise<StudentEnrollmentResponse> {
    const normalizedInput = this.normalizeCreateInput(input);
    const actorObjectId = this.toObjectId(actorId, "Authenticated user id is invalid.");

    await this.ensureReferencedRecordsExist(normalizedInput);
    await this.ensureEnrollmentIsAvailable(normalizedInput);
    await this.ensureRollNumberIsAvailable(normalizedInput);

    const enrollment = await this.createEnrollment({
      ...normalizedInput,
      createdBy: actorObjectId,
      updatedBy: actorObjectId
    });

    return this.findById(enrollment.id);
  }

  async findAll(): Promise<StudentEnrollmentListResponse> {
    const enrollments = await this.studentEnrollments.findAll();

    return {
      studentEnrollments: enrollments.map((enrollment) => this.toResponse(enrollment))
    };
  }

  async findById(id: string): Promise<StudentEnrollmentResponse> {
    this.assertValidId(id, "Student enrollment id is invalid.");

    const enrollment = await this.studentEnrollments.findById(id);

    if (!enrollment) {
      throw new NotFoundError("Student enrollment was not found.");
    }

    return this.toResponse(enrollment);
  }

  async update(id: string, input: UpdateStudentEnrollmentRequest, actorId: string): Promise<StudentEnrollmentResponse> {
    this.assertValidId(id, "Student enrollment id is invalid.");

    const normalizedInput = this.normalizeUpdateInput(input);
    const actorObjectId = this.toObjectId(actorId, "Authenticated user id is invalid.");
    const existingEnrollment = await this.studentEnrollments.findById(id);

    if (!existingEnrollment) {
      throw new NotFoundError("Student enrollment was not found.");
    }

    const nextEnrollmentCriteria = this.mergeEnrollmentCriteria(existingEnrollment, normalizedInput);
    const nextRollNumberCriteria = this.mergeRollNumberCriteria(existingEnrollment, normalizedInput);

    await this.ensureReferencedRecordsExist(nextEnrollmentCriteria);

    if (this.hasEnrollmentCriteriaChanged(existingEnrollment, nextEnrollmentCriteria)) {
      await this.ensureEnrollmentIsAvailable(nextEnrollmentCriteria);
    }

    if (this.hasRollNumberCriteriaChanged(existingEnrollment, nextRollNumberCriteria)) {
      await this.ensureRollNumberIsAvailable(nextRollNumberCriteria);
    }

    const updatedEnrollment = await this.updateEnrollment(id, {
      ...normalizedInput,
      updatedBy: actorObjectId
    });

    if (!updatedEnrollment) {
      throw new NotFoundError("Student enrollment was not found.");
    }

    return this.toResponse(updatedEnrollment);
  }

  async delete(id: string): Promise<DeleteStudentEnrollmentResponse> {
    this.assertValidId(id, "Student enrollment id is invalid.");

    const deleted = await this.studentEnrollments.delete(id);

    if (!deleted) {
      throw new NotFoundError("Student enrollment was not found.");
    }

    return {
      message: "Student enrollment deleted successfully."
    };
  }

  private async ensureReferencedRecordsExist(criteria: StudentEnrollmentUniquenessCriteria): Promise<void> {
    const [studentExists, classroomExists] = await Promise.all([
      this.studentEnrollments.studentExists(criteria.studentId),
      this.studentEnrollments.classroomExists(criteria.classroomId)
    ]);

    if (!studentExists) {
      throw new NotFoundError("Student was not found.");
    }

    if (!classroomExists) {
      throw new NotFoundError("Classroom was not found.");
    }
  }

  private async ensureEnrollmentIsAvailable(criteria: StudentEnrollmentUniquenessCriteria): Promise<void> {
    const existingEnrollment = await this.studentEnrollments.findByUniqueCriteria(criteria);

    if (existingEnrollment) {
      throw new ConflictError("This student enrollment already exists.");
    }
  }

  private async ensureRollNumberIsAvailable(criteria: RollNumberUniquenessCriteria): Promise<void> {
    const existingEnrollment = await this.studentEnrollments.findByRollNumberCriteria(criteria);

    if (existingEnrollment) {
      throw new ConflictError("This roll number is already assigned in the classroom for this academic year.");
    }
  }

  private async createEnrollment(input: {
    studentId: Types.ObjectId;
    classroomId: Types.ObjectId;
    academicYear: string;
    rollNumber: string;
    status: StudentEnrollmentStatus;
    createdBy: Types.ObjectId;
    updatedBy: Types.ObjectId;
  }): Promise<StudentEnrollmentDocument> {
    try {
      return await this.studentEnrollments.create(input);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictError("This student enrollment or roll number already exists.");
      }

      throw error;
    }
  }

  private async updateEnrollment(
    id: string,
    input: UpdateStudentEnrollmentRecord
  ): Promise<StudentEnrollmentDocument | null> {
    try {
      return await this.studentEnrollments.update(id, input);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictError("This student enrollment or roll number already exists.");
      }

      throw error;
    }
  }

  private normalizeCreateInput(input: CreateStudentEnrollmentRequest): StudentEnrollmentUniquenessCriteria &
    RollNumberUniquenessCriteria & {
      status: StudentEnrollmentStatus;
    } {
    return {
      studentId: this.toObjectId(input.studentId, "Student id is invalid."),
      classroomId: this.toObjectId(input.classroomId, "Classroom id is invalid."),
      academicYear: this.requiredAcademicYear(input.academicYear),
      rollNumber: this.requiredString(input.rollNumber, "Roll number is required.").toUpperCase(),
      status: this.normalizeStatus(input.status)
    };
  }

  private normalizeUpdateInput(input: UpdateStudentEnrollmentRequest): NormalizedStudentEnrollmentUpdate {
    const normalizedInput: NormalizedStudentEnrollmentUpdate = {};

    if (input.studentId !== undefined) {
      normalizedInput.studentId = this.toObjectId(input.studentId, "Student id is invalid.");
    }

    if (input.classroomId !== undefined) {
      normalizedInput.classroomId = this.toObjectId(input.classroomId, "Classroom id is invalid.");
    }

    if (input.academicYear !== undefined) {
      normalizedInput.academicYear = this.requiredAcademicYear(input.academicYear);
    }

    if (input.rollNumber !== undefined) {
      normalizedInput.rollNumber = this.requiredString(input.rollNumber, "Roll number cannot be empty.").toUpperCase();
    }

    if (input.status !== undefined) {
      normalizedInput.status = this.normalizeStatus(input.status);
    }

    return normalizedInput;
  }

  private mergeEnrollmentCriteria(
    enrollment: StudentEnrollmentDocument,
    input: {
      studentId?: Types.ObjectId;
      classroomId?: Types.ObjectId;
      academicYear?: string;
    }
  ): StudentEnrollmentUniquenessCriteria {
    return {
      studentId: input.studentId ?? this.getObjectId(enrollment.studentId),
      classroomId: input.classroomId ?? this.getObjectId(enrollment.classroomId),
      academicYear: input.academicYear ?? enrollment.academicYear
    };
  }

  private mergeRollNumberCriteria(
    enrollment: StudentEnrollmentDocument,
    input: {
      classroomId?: Types.ObjectId;
      academicYear?: string;
      rollNumber?: string;
    }
  ): RollNumberUniquenessCriteria {
    return {
      classroomId: input.classroomId ?? this.getObjectId(enrollment.classroomId),
      academicYear: input.academicYear ?? enrollment.academicYear,
      rollNumber: input.rollNumber ?? enrollment.rollNumber
    };
  }

  private hasEnrollmentCriteriaChanged(
    enrollment: StudentEnrollmentDocument,
    criteria: StudentEnrollmentUniquenessCriteria
  ): boolean {
    return (
      !this.getObjectId(enrollment.studentId).equals(criteria.studentId) ||
      !this.getObjectId(enrollment.classroomId).equals(criteria.classroomId) ||
      enrollment.academicYear !== criteria.academicYear
    );
  }

  private hasRollNumberCriteriaChanged(
    enrollment: StudentEnrollmentDocument,
    criteria: RollNumberUniquenessCriteria
  ): boolean {
    return (
      !this.getObjectId(enrollment.classroomId).equals(criteria.classroomId) ||
      enrollment.academicYear !== criteria.academicYear ||
      enrollment.rollNumber !== criteria.rollNumber
    );
  }

  private requiredAcademicYear(value: string): string {
    const academicYear = this.requiredString(value, "Academic year is required.");

    if (!academicYearPattern.test(academicYear)) {
      throw new ValidationError("Academic year must use YYYY-YY format.");
    }

    return academicYear;
  }

  private requiredString(value: string, message: string): string {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      throw new ValidationError(message);
    }

    return normalizedValue;
  }

  private normalizeStatus(status: StudentEnrollmentStatus = "ACTIVE"): StudentEnrollmentStatus {
    if (!studentEnrollmentStatuses.includes(status)) {
      throw new ValidationError("Status must be ACTIVE or INACTIVE.");
    }

    return status;
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

    throw new ValidationError("Student enrollment reference is invalid.");
  }

  private toResponse(enrollment: StudentEnrollmentDocument): StudentEnrollmentResponse {
    return {
      id: enrollment.id,
      student: this.toStudentResponse(this.getPopulatedStudent(enrollment.studentId)),
      classroom: this.toClassroomResponse(this.getPopulatedClassroom(enrollment.classroomId)),
      academicYear: enrollment.academicYear,
      rollNumber: enrollment.rollNumber,
      status: enrollment.status,
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

    throw new ValidationError("Student enrollment student reference is not populated.");
  }

  private getPopulatedClassroom(value: unknown): ClassroomDocument {
    if (typeof value === "object" && value !== null && "capacity" in value) {
      return value as ClassroomDocument;
    }

    throw new ValidationError("Student enrollment classroom reference is not populated.");
  }

  private toStudentResponse(student: StudentDocument & Student): StudentEnrollmentStudentResponse {
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

  private toClassroomResponse(classroom: ClassroomDocument & Classroom): StudentEnrollmentClassroomResponse {
    return {
      id: classroom.id,
      name: classroom.name,
      department: classroom.department,
      semester: classroom.semester,
      section: classroom.section,
      academicYear: classroom.academicYear,
      capacity: classroom.capacity,
      status: classroom.status
    };
  }

  private isDuplicateKeyError(error: unknown): error is { code: number } {
    return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
  }
}

export const studentEnrollmentService = new StudentEnrollmentService();

