import { isValidObjectId, Types } from "mongoose";
import { ConflictError, NotFoundError, ValidationError } from "../../../shared/errors/index.js";
import type { Classroom, ClassroomDocument } from "../../classrooms/models/classroom.model.js";
import type { Subject, SubjectDocument } from "../../subjects/models/subject.model.js";
import type { Teacher, TeacherDocument } from "../../teachers/models/teacher.model.js";
import type {
  CreateTeacherAssignmentRequest,
  DeleteTeacherAssignmentResponse,
  TeacherAssignmentClassroomResponse,
  TeacherAssignmentListResponse,
  TeacherAssignmentResponse,
  TeacherAssignmentSubjectResponse,
  TeacherAssignmentTeacherResponse,
  UpdateTeacherAssignmentRequest
} from "../dtos/teacher-assignment.dto.js";
import {
  teacherAssignmentStatuses,
  type TeacherAssignmentDocument,
  type TeacherAssignmentStatus
} from "../models/teacher-assignment.model.js";
import {
  teacherAssignmentRepository,
  type TeacherAssignmentUniquenessCriteria,
  type UpdateTeacherAssignmentRecord
} from "../repositories/teacher-assignment.repository.js";

const academicYearPattern = /^\d{4}-\d{2}$/;

type NormalizedTeacherAssignmentUpdate = Partial<
  Pick<TeacherAssignmentUniquenessCriteria, "teacherId" | "subjectId" | "classroomId" | "academicYear">
> & {
  status?: TeacherAssignmentStatus;
};

export class TeacherAssignmentService {
  constructor(private readonly teacherAssignments = teacherAssignmentRepository) {}

  async create(input: CreateTeacherAssignmentRequest, actorId: string): Promise<TeacherAssignmentResponse> {
    const normalizedInput = this.normalizeCreateInput(input);
    const actorObjectId = this.toObjectId(actorId, "Authenticated user id is invalid.");

    await this.ensureReferencedRecordsExist(normalizedInput);
    await this.ensureAssignmentIsAvailable(normalizedInput);

    const assignment = await this.createAssignment({
      ...normalizedInput,
      createdBy: actorObjectId,
      updatedBy: actorObjectId
    });

    return this.findById(assignment.id);
  }

  async findAll(): Promise<TeacherAssignmentListResponse> {
    const assignments = await this.teacherAssignments.findAll();

    return {
      teacherAssignments: assignments.map((assignment) => this.toResponse(assignment))
    };
  }

  async findById(id: string): Promise<TeacherAssignmentResponse> {
    this.assertValidId(id, "Teacher assignment id is invalid.");

    const assignment = await this.teacherAssignments.findById(id);

    if (!assignment) {
      throw new NotFoundError("Teacher assignment was not found.");
    }

    return this.toResponse(assignment);
  }

  async update(id: string, input: UpdateTeacherAssignmentRequest, actorId: string): Promise<TeacherAssignmentResponse> {
    this.assertValidId(id, "Teacher assignment id is invalid.");

    const normalizedInput = this.normalizeUpdateInput(input);
    const actorObjectId = this.toObjectId(actorId, "Authenticated user id is invalid.");
    const existingAssignment = await this.teacherAssignments.findById(id);

    if (!existingAssignment) {
      throw new NotFoundError("Teacher assignment was not found.");
    }

    const nextUniqueCriteria = this.mergeUniqueCriteria(existingAssignment, normalizedInput);

    await this.ensureReferencedRecordsExist(nextUniqueCriteria);

    if (this.hasUniqueCriteriaChanged(existingAssignment, nextUniqueCriteria)) {
      await this.ensureAssignmentIsAvailable(nextUniqueCriteria);
    }

    const updatedAssignment = await this.updateAssignment(id, {
      ...normalizedInput,
      updatedBy: actorObjectId
    });

    if (!updatedAssignment) {
      throw new NotFoundError("Teacher assignment was not found.");
    }

    return this.toResponse(updatedAssignment);
  }

  async delete(id: string): Promise<DeleteTeacherAssignmentResponse> {
    this.assertValidId(id, "Teacher assignment id is invalid.");

    const deleted = await this.teacherAssignments.delete(id);

    if (!deleted) {
      throw new NotFoundError("Teacher assignment was not found.");
    }

    return {
      message: "Teacher assignment deleted successfully."
    };
  }

  private async ensureReferencedRecordsExist(criteria: TeacherAssignmentUniquenessCriteria): Promise<void> {
    const [teacherExists, subjectExists, classroomExists] = await Promise.all([
      this.teacherAssignments.teacherExists(criteria.teacherId),
      this.teacherAssignments.subjectExists(criteria.subjectId),
      this.teacherAssignments.classroomExists(criteria.classroomId)
    ]);

    if (!teacherExists) {
      throw new NotFoundError("Teacher was not found.");
    }

    if (!subjectExists) {
      throw new NotFoundError("Subject was not found.");
    }

    if (!classroomExists) {
      throw new NotFoundError("Classroom was not found.");
    }
  }

  private async ensureAssignmentIsAvailable(criteria: TeacherAssignmentUniquenessCriteria): Promise<void> {
    const existingAssignment = await this.teacherAssignments.findByUniqueCriteria(criteria);

    if (existingAssignment) {
      throw new ConflictError("This teacher assignment already exists.");
    }
  }

  private async createAssignment(input: {
    teacherId: Types.ObjectId;
    subjectId: Types.ObjectId;
    classroomId: Types.ObjectId;
    academicYear: string;
    status: TeacherAssignmentStatus;
    createdBy: Types.ObjectId;
    updatedBy: Types.ObjectId;
  }): Promise<TeacherAssignmentDocument> {
    try {
      return await this.teacherAssignments.create(input);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictError("This teacher assignment already exists.");
      }

      throw error;
    }
  }

  private async updateAssignment(
    id: string,
    input: UpdateTeacherAssignmentRecord
  ): Promise<TeacherAssignmentDocument | null> {
    try {
      return await this.teacherAssignments.update(id, input);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictError("This teacher assignment already exists.");
      }

      throw error;
    }
  }

  private normalizeCreateInput(input: CreateTeacherAssignmentRequest): TeacherAssignmentUniquenessCriteria & {
    status: TeacherAssignmentStatus;
  } {
    return {
      teacherId: this.toObjectId(input.teacherId, "Teacher id is invalid."),
      subjectId: this.toObjectId(input.subjectId, "Subject id is invalid."),
      classroomId: this.toObjectId(input.classroomId, "Classroom id is invalid."),
      academicYear: this.requiredAcademicYear(input.academicYear),
      status: this.normalizeStatus(input.status)
    };
  }

  private normalizeUpdateInput(input: UpdateTeacherAssignmentRequest): NormalizedTeacherAssignmentUpdate {
    const normalizedInput: NormalizedTeacherAssignmentUpdate = {};

    if (input.teacherId !== undefined) {
      normalizedInput.teacherId = this.toObjectId(input.teacherId, "Teacher id is invalid.");
    }

    if (input.subjectId !== undefined) {
      normalizedInput.subjectId = this.toObjectId(input.subjectId, "Subject id is invalid.");
    }

    if (input.classroomId !== undefined) {
      normalizedInput.classroomId = this.toObjectId(input.classroomId, "Classroom id is invalid.");
    }

    if (input.academicYear !== undefined) {
      normalizedInput.academicYear = this.requiredAcademicYear(input.academicYear);
    }

    if (input.status !== undefined) {
      normalizedInput.status = this.normalizeStatus(input.status);
    }

    return normalizedInput;
  }

  private mergeUniqueCriteria(
    assignment: TeacherAssignmentDocument,
    input: {
      teacherId?: Types.ObjectId;
      subjectId?: Types.ObjectId;
      classroomId?: Types.ObjectId;
      academicYear?: string;
    }
  ): TeacherAssignmentUniquenessCriteria {
    return {
      teacherId: input.teacherId ?? this.getObjectId(assignment.teacherId),
      subjectId: input.subjectId ?? this.getObjectId(assignment.subjectId),
      classroomId: input.classroomId ?? this.getObjectId(assignment.classroomId),
      academicYear: input.academicYear ?? assignment.academicYear
    };
  }

  private hasUniqueCriteriaChanged(
    assignment: TeacherAssignmentDocument,
    criteria: TeacherAssignmentUniquenessCriteria
  ): boolean {
    return (
      !this.getObjectId(assignment.teacherId).equals(criteria.teacherId) ||
      !this.getObjectId(assignment.subjectId).equals(criteria.subjectId) ||
      !this.getObjectId(assignment.classroomId).equals(criteria.classroomId) ||
      assignment.academicYear !== criteria.academicYear
    );
  }

  private requiredAcademicYear(value: string): string {
    const academicYear = value.trim();

    if (!academicYear) {
      throw new ValidationError("Academic year is required.");
    }

    if (!academicYearPattern.test(academicYear)) {
      throw new ValidationError("Academic year must use YYYY-YY format.");
    }

    return academicYear;
  }

  private normalizeStatus(status: TeacherAssignmentStatus = "ACTIVE"): TeacherAssignmentStatus {
    if (!teacherAssignmentStatuses.includes(status)) {
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

    throw new ValidationError("Teacher assignment reference is invalid.");
  }

  private toResponse(assignment: TeacherAssignmentDocument): TeacherAssignmentResponse {
    return {
      id: assignment.id,
      teacher: this.toTeacherResponse(this.getPopulatedTeacher(assignment.teacherId)),
      subject: this.toSubjectResponse(this.getPopulatedSubject(assignment.subjectId)),
      classroom: this.toClassroomResponse(this.getPopulatedClassroom(assignment.classroomId)),
      academicYear: assignment.academicYear,
      status: assignment.status,
      createdBy: assignment.createdBy.toString(),
      updatedBy: assignment.updatedBy.toString(),
      createdAt: assignment.createdAt.toISOString(),
      updatedAt: assignment.updatedAt.toISOString()
    };
  }

  private getPopulatedTeacher(value: unknown): TeacherDocument {
    if (typeof value === "object" && value !== null && "employeeId" in value) {
      return value as TeacherDocument;
    }

    throw new ValidationError("Teacher assignment teacher reference is not populated.");
  }

  private getPopulatedSubject(value: unknown): SubjectDocument {
    if (typeof value === "object" && value !== null && "subjectCode" in value) {
      return value as SubjectDocument;
    }

    throw new ValidationError("Teacher assignment subject reference is not populated.");
  }

  private getPopulatedClassroom(value: unknown): ClassroomDocument {
    if (typeof value === "object" && value !== null && "capacity" in value) {
      return value as ClassroomDocument;
    }

    throw new ValidationError("Teacher assignment classroom reference is not populated.");
  }

  private toTeacherResponse(teacher: TeacherDocument & Teacher): TeacherAssignmentTeacherResponse {
    return {
      id: teacher.id,
      employeeId: teacher.employeeId,
      name: teacher.name,
      email: teacher.email,
      department: teacher.department,
      designation: teacher.designation,
      status: teacher.status
    };
  }

  private toSubjectResponse(subject: SubjectDocument & Subject): TeacherAssignmentSubjectResponse {
    return {
      id: subject.id,
      subjectCode: subject.subjectCode,
      name: subject.name,
      department: subject.department,
      semester: subject.semester,
      credits: subject.credits,
      status: subject.status
    };
  }

  private toClassroomResponse(classroom: ClassroomDocument & Classroom): TeacherAssignmentClassroomResponse {
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

export const teacherAssignmentService = new TeacherAssignmentService();
