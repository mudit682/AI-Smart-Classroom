import { isValidObjectId, Types } from "mongoose";
import { ConflictError, NotFoundError, ValidationError } from "../../../shared/errors/index.js";
import type { Classroom, ClassroomDocument } from "../../classrooms/models/classroom.model.js";
import type { Subject, SubjectDocument } from "../../subjects/models/subject.model.js";
import type {
  TeacherAssignment,
  TeacherAssignmentDocument
} from "../../teacher-assignments/models/teacher-assignment.model.js";
import type { Teacher, TeacherDocument } from "../../teachers/models/teacher.model.js";
import type {
  CreateLectureScheduleRequest,
  DeleteLectureScheduleResponse,
  LectureScheduleClassroomResponse,
  LectureScheduleListResponse,
  LectureScheduleResponse,
  LectureScheduleSubjectResponse,
  LectureScheduleTeacherAssignmentResponse,
  LectureScheduleTeacherResponse,
  UpdateLectureScheduleRequest
} from "../dtos/lecture-schedule.dto.js";
import {
  lectureScheduleDays,
  lectureScheduleStatuses,
  type LectureScheduleDay,
  type LectureScheduleDocument,
  type LectureScheduleStatus
} from "../models/lecture-schedule.model.js";
import {
  lectureScheduleRepository,
  type LectureScheduleOverlapCriteria,
  type LectureScheduleSlotCriteria,
  type UpdateLectureScheduleRecord
} from "../repositories/lecture-schedule.repository.js";

const academicYearPattern = /^\d{4}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

type NormalizedLectureScheduleCreate = LectureScheduleSlotCriteria & {
  teacherAssignmentId: Types.ObjectId;
  subjectId: Types.ObjectId;
  teacherId: Types.ObjectId;
  academicYear: string;
  semester: string;
  status: LectureScheduleStatus;
};

type NormalizedLectureScheduleUpdate = Partial<
  Pick<
    NormalizedLectureScheduleCreate,
    | "teacherAssignmentId"
    | "classroomId"
    | "subjectId"
    | "teacherId"
    | "academicYear"
    | "semester"
    | "dayOfWeek"
    | "startTime"
    | "endTime"
    | "status"
  >
>;

export class LectureScheduleService {
  constructor(private readonly lectureSchedules = lectureScheduleRepository) {}

  async create(input: CreateLectureScheduleRequest, actorId: string): Promise<LectureScheduleResponse> {
    const normalizedInput = this.normalizeCreateInput(input);
    const actorObjectId = this.toObjectId(actorId, "Authenticated user id is invalid.");

    await this.ensureReferencedRecordsExist(normalizedInput);
    await this.ensureSlotIsAvailable(normalizedInput);
    await this.ensureNoClassroomOverlap(normalizedInput);

    const schedule = await this.createSchedule({
      ...normalizedInput,
      createdBy: actorObjectId,
      updatedBy: actorObjectId
    });

    return this.findById(schedule.id);
  }

  async findAll(): Promise<LectureScheduleListResponse> {
    const schedules = await this.lectureSchedules.findAll();

    return {
      lectureSchedules: schedules.map((schedule) => this.toResponse(schedule))
    };
  }

  async findById(id: string): Promise<LectureScheduleResponse> {
    this.assertValidId(id, "Lecture schedule id is invalid.");

    const schedule = await this.lectureSchedules.findById(id);

    if (!schedule) {
      throw new NotFoundError("Lecture schedule was not found.");
    }

    return this.toResponse(schedule);
  }

  async update(id: string, input: UpdateLectureScheduleRequest, actorId: string): Promise<LectureScheduleResponse> {
    this.assertValidId(id, "Lecture schedule id is invalid.");

    const normalizedInput = this.normalizeUpdateInput(input);
    const actorObjectId = this.toObjectId(actorId, "Authenticated user id is invalid.");
    const existingSchedule = await this.lectureSchedules.findById(id);

    if (!existingSchedule) {
      throw new NotFoundError("Lecture schedule was not found.");
    }

    const nextSchedule = this.mergeSchedule(existingSchedule, normalizedInput);

    await this.ensureReferencedRecordsExist(nextSchedule);

    if (this.hasSlotChanged(existingSchedule, nextSchedule)) {
      await this.ensureSlotIsAvailable(nextSchedule);
    }

    await this.ensureNoClassroomOverlap({
      ...nextSchedule,
      excludeId: id
    });

    const updatedSchedule = await this.updateSchedule(id, {
      ...normalizedInput,
      updatedBy: actorObjectId
    });

    if (!updatedSchedule) {
      throw new NotFoundError("Lecture schedule was not found.");
    }

    return this.toResponse(updatedSchedule);
  }

  async delete(id: string): Promise<DeleteLectureScheduleResponse> {
    this.assertValidId(id, "Lecture schedule id is invalid.");

    const deleted = await this.lectureSchedules.delete(id);

    if (!deleted) {
      throw new NotFoundError("Lecture schedule was not found.");
    }

    return {
      message: "Lecture schedule deleted successfully."
    };
  }

  private async ensureReferencedRecordsExist(input: {
    teacherAssignmentId: Types.ObjectId;
    classroomId: Types.ObjectId;
    subjectId: Types.ObjectId;
    teacherId: Types.ObjectId;
  }): Promise<void> {
    const [teacherAssignmentExists, classroomExists, subjectExists, teacherExists] = await Promise.all([
      this.lectureSchedules.teacherAssignmentExists(input.teacherAssignmentId),
      this.lectureSchedules.classroomExists(input.classroomId),
      this.lectureSchedules.subjectExists(input.subjectId),
      this.lectureSchedules.teacherExists(input.teacherId)
    ]);

    if (!teacherAssignmentExists) {
      throw new NotFoundError("Teacher assignment was not found.");
    }

    if (!classroomExists) {
      throw new NotFoundError("Classroom was not found.");
    }

    if (!subjectExists) {
      throw new NotFoundError("Subject was not found.");
    }

    if (!teacherExists) {
      throw new NotFoundError("Teacher was not found.");
    }
  }

  private async ensureSlotIsAvailable(criteria: LectureScheduleSlotCriteria): Promise<void> {
    const existingSchedule = await this.lectureSchedules.findBySlot(criteria);

    if (existingSchedule) {
      throw new ConflictError("A lecture schedule already exists for this classroom, day, and time slot.");
    }
  }

  private async ensureNoClassroomOverlap(criteria: LectureScheduleOverlapCriteria): Promise<void> {
    const overlappingSchedule = await this.lectureSchedules.findOverlapping(criteria);

    if (overlappingSchedule) {
      throw new ConflictError("A lecture schedule overlaps with this classroom time slot.");
    }
  }

  private async createSchedule(input: NormalizedLectureScheduleCreate & {
    createdBy: Types.ObjectId;
    updatedBy: Types.ObjectId;
  }): Promise<LectureScheduleDocument> {
    try {
      return await this.lectureSchedules.create(input);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictError("A lecture schedule already exists for this classroom, day, and time slot.");
      }

      throw error;
    }
  }

  private async updateSchedule(
    id: string,
    input: UpdateLectureScheduleRecord
  ): Promise<LectureScheduleDocument | null> {
    try {
      return await this.lectureSchedules.update(id, input);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictError("A lecture schedule already exists for this classroom, day, and time slot.");
      }

      throw error;
    }
  }

  private normalizeCreateInput(input: CreateLectureScheduleRequest): NormalizedLectureScheduleCreate {
    const startTime = this.requiredTime(input.startTime, "Start time is required.");
    const endTime = this.requiredTime(input.endTime, "End time is required.");

    this.assertStartTimeBeforeEndTime(startTime, endTime);

    return {
      teacherAssignmentId: this.toObjectId(input.teacherAssignmentId, "Teacher assignment id is invalid."),
      classroomId: this.toObjectId(input.classroomId, "Classroom id is invalid."),
      subjectId: this.toObjectId(input.subjectId, "Subject id is invalid."),
      teacherId: this.toObjectId(input.teacherId, "Teacher id is invalid."),
      academicYear: this.requiredAcademicYear(input.academicYear),
      semester: this.requiredString(input.semester, "Semester is required."),
      dayOfWeek: this.requiredDay(input.dayOfWeek),
      startTime,
      endTime,
      status: this.normalizeStatus(input.status)
    };
  }

  private normalizeUpdateInput(input: UpdateLectureScheduleRequest): NormalizedLectureScheduleUpdate {
    const normalizedInput: NormalizedLectureScheduleUpdate = {};

    if (input.teacherAssignmentId !== undefined) {
      normalizedInput.teacherAssignmentId = this.toObjectId(input.teacherAssignmentId, "Teacher assignment id is invalid.");
    }

    if (input.classroomId !== undefined) {
      normalizedInput.classroomId = this.toObjectId(input.classroomId, "Classroom id is invalid.");
    }

    if (input.subjectId !== undefined) {
      normalizedInput.subjectId = this.toObjectId(input.subjectId, "Subject id is invalid.");
    }

    if (input.teacherId !== undefined) {
      normalizedInput.teacherId = this.toObjectId(input.teacherId, "Teacher id is invalid.");
    }

    if (input.academicYear !== undefined) {
      normalizedInput.academicYear = this.requiredAcademicYear(input.academicYear);
    }

    if (input.semester !== undefined) {
      normalizedInput.semester = this.requiredString(input.semester, "Semester cannot be empty.");
    }

    if (input.dayOfWeek !== undefined) {
      normalizedInput.dayOfWeek = this.requiredDay(input.dayOfWeek);
    }

    if (input.startTime !== undefined) {
      normalizedInput.startTime = this.requiredTime(input.startTime, "Start time cannot be empty.");
    }

    if (input.endTime !== undefined) {
      normalizedInput.endTime = this.requiredTime(input.endTime, "End time cannot be empty.");
    }

    if (input.status !== undefined) {
      normalizedInput.status = this.normalizeStatus(input.status);
    }

    if (normalizedInput.startTime !== undefined && normalizedInput.endTime !== undefined) {
      this.assertStartTimeBeforeEndTime(normalizedInput.startTime, normalizedInput.endTime);
    }

    return normalizedInput;
  }

  private mergeSchedule(
    schedule: LectureScheduleDocument,
    input: NormalizedLectureScheduleUpdate
  ): NormalizedLectureScheduleCreate {
    const nextSchedule = {
      teacherAssignmentId: input.teacherAssignmentId ?? this.getObjectId(schedule.teacherAssignmentId),
      classroomId: input.classroomId ?? this.getObjectId(schedule.classroomId),
      subjectId: input.subjectId ?? this.getObjectId(schedule.subjectId),
      teacherId: input.teacherId ?? this.getObjectId(schedule.teacherId),
      academicYear: input.academicYear ?? schedule.academicYear,
      semester: input.semester ?? schedule.semester,
      dayOfWeek: input.dayOfWeek ?? schedule.dayOfWeek,
      startTime: input.startTime ?? schedule.startTime,
      endTime: input.endTime ?? schedule.endTime,
      status: input.status ?? schedule.status
    };

    this.assertStartTimeBeforeEndTime(nextSchedule.startTime, nextSchedule.endTime);

    return nextSchedule;
  }

  private hasSlotChanged(schedule: LectureScheduleDocument, criteria: LectureScheduleSlotCriteria): boolean {
    return (
      !this.getObjectId(schedule.classroomId).equals(criteria.classroomId) ||
      schedule.dayOfWeek !== criteria.dayOfWeek ||
      schedule.startTime !== criteria.startTime ||
      schedule.endTime !== criteria.endTime
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

  private requiredDay(value: LectureScheduleDay): LectureScheduleDay {
    if (!lectureScheduleDays.includes(value)) {
      throw new ValidationError("Day of week must be MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, or SATURDAY.");
    }

    return value;
  }

  private requiredTime(value: string, message: string): string {
    const time = this.requiredString(value, message);

    if (!timePattern.test(time)) {
      throw new ValidationError("Time must use HH:mm format.");
    }

    return time;
  }

  private assertStartTimeBeforeEndTime(startTime: string, endTime: string): void {
    if (this.toMinutes(startTime) >= this.toMinutes(endTime)) {
      throw new ValidationError("Start time must be before end time.");
    }
  }

  private toMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);

    return hours * 60 + minutes;
  }

  private normalizeStatus(status: LectureScheduleStatus = "ACTIVE"): LectureScheduleStatus {
    if (!lectureScheduleStatuses.includes(status)) {
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

    throw new ValidationError("Lecture schedule reference is invalid.");
  }

  private toResponse(schedule: LectureScheduleDocument): LectureScheduleResponse {
    return {
      id: schedule.id,
      teacherAssignment: this.toTeacherAssignmentResponse(this.getPopulatedTeacherAssignment(schedule.teacherAssignmentId)),
      classroom: this.toClassroomResponse(this.getPopulatedClassroom(schedule.classroomId)),
      subject: this.toSubjectResponse(this.getPopulatedSubject(schedule.subjectId)),
      teacher: this.toTeacherResponse(this.getPopulatedTeacher(schedule.teacherId)),
      academicYear: schedule.academicYear,
      semester: schedule.semester,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      status: schedule.status,
      createdBy: schedule.createdBy.toString(),
      updatedBy: schedule.updatedBy.toString(),
      createdAt: schedule.createdAt.toISOString(),
      updatedAt: schedule.updatedAt.toISOString()
    };
  }

  private getPopulatedTeacherAssignment(value: unknown): TeacherAssignmentDocument {
    if (typeof value === "object" && value !== null && "academicYear" in value && "teacherId" in value) {
      return value as TeacherAssignmentDocument;
    }

    throw new ValidationError("Lecture schedule teacher assignment reference is not populated.");
  }

  private getPopulatedClassroom(value: unknown): ClassroomDocument {
    if (typeof value === "object" && value !== null && "capacity" in value) {
      return value as ClassroomDocument;
    }

    throw new ValidationError("Lecture schedule classroom reference is not populated.");
  }

  private getPopulatedSubject(value: unknown): SubjectDocument {
    if (typeof value === "object" && value !== null && "subjectCode" in value) {
      return value as SubjectDocument;
    }

    throw new ValidationError("Lecture schedule subject reference is not populated.");
  }

  private getPopulatedTeacher(value: unknown): TeacherDocument {
    if (typeof value === "object" && value !== null && "employeeId" in value) {
      return value as TeacherDocument;
    }

    throw new ValidationError("Lecture schedule teacher reference is not populated.");
  }

  private toTeacherAssignmentResponse(
    teacherAssignment: TeacherAssignmentDocument & TeacherAssignment
  ): LectureScheduleTeacherAssignmentResponse {
    return {
      id: teacherAssignment.id,
      academicYear: teacherAssignment.academicYear,
      status: teacherAssignment.status
    };
  }

  private toClassroomResponse(classroom: ClassroomDocument & Classroom): LectureScheduleClassroomResponse {
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

  private toSubjectResponse(subject: SubjectDocument & Subject): LectureScheduleSubjectResponse {
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

  private toTeacherResponse(teacher: TeacherDocument & Teacher): LectureScheduleTeacherResponse {
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

  private isDuplicateKeyError(error: unknown): error is { code: number } {
    return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
  }
}

export const lectureScheduleService = new LectureScheduleService();

