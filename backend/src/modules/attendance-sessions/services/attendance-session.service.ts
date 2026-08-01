import { isValidObjectId, Types } from "mongoose";
import { ConflictError, NotFoundError, ValidationError } from "../../../shared/errors/index.js";
import type { Classroom, ClassroomDocument } from "../../classrooms/models/classroom.model.js";
import type { LectureSchedule, LectureScheduleDocument } from "../../lecture-schedules/models/lecture-schedule.model.js";
import type { Subject, SubjectDocument } from "../../subjects/models/subject.model.js";
import type {
  TeacherAssignment,
  TeacherAssignmentDocument
} from "../../teacher-assignments/models/teacher-assignment.model.js";
import type { Teacher, TeacherDocument } from "../../teachers/models/teacher.model.js";
import type {
  AttendanceSessionClassroomResponse,
  AttendanceSessionLectureScheduleResponse,
  AttendanceSessionListResponse,
  AttendanceSessionResponse,
  AttendanceSessionSubjectResponse,
  AttendanceSessionTeacherAssignmentResponse,
  AttendanceSessionTeacherResponse,
  StartAttendanceSessionRequest
} from "../dtos/attendance-session.dto.js";
import type { AttendanceSessionDocument } from "../models/attendance-session.model.js";
import { attendanceSessionRepository } from "../repositories/attendance-session.repository.js";

export class AttendanceSessionService {
  constructor(private readonly attendanceSessions = attendanceSessionRepository) {}

  async start(input: StartAttendanceSessionRequest, actorId: string): Promise<AttendanceSessionResponse> {
    const lectureScheduleId = this.toObjectId(input.lectureScheduleId, "Lecture schedule id is invalid.");
    const actorObjectId = this.toObjectId(actorId, "Authenticated user id is invalid.");
    const lectureSchedule = await this.attendanceSessions.findLectureScheduleById(lectureScheduleId);

    if (!lectureSchedule) {
      throw new NotFoundError("Lecture schedule was not found.");
    }

    const sessionDate = this.normalizeSessionDate(input.sessionDate);
    const existingActiveSession = await this.attendanceSessions.findActiveByLectureScheduleAndDate({
      lectureScheduleId,
      sessionDate
    });

    if (existingActiveSession) {
      throw new ConflictError("An active attendance session already exists for this lecture schedule on this date.");
    }

    const totalStudents = await this.attendanceSessions.countActiveStudentEnrollments(
      this.getObjectId(lectureSchedule.classroomId),
      lectureSchedule.academicYear
    );
    const now = new Date();

    const session = await this.createSession({
      lectureScheduleId,
      teacherAssignmentId: this.getObjectId(lectureSchedule.teacherAssignmentId),
      classroomId: this.getObjectId(lectureSchedule.classroomId),
      teacherId: this.getObjectId(lectureSchedule.teacherId),
      subjectId: this.getObjectId(lectureSchedule.subjectId),
      sessionDate,
      startedAt: now,
      endedAt: null,
      captureCount: 0,
      maxCaptures: 3,
      totalStudents,
      recognizedStudents: 0,
      absentStudents: totalStudents,
      recognitionStatus: "PENDING",
      capturedImages: [],
      status: "ACTIVE",
      createdBy: actorObjectId,
      updatedBy: actorObjectId
    });

    return this.findById(session.id);
  }

  async end(id: string, actorId: string): Promise<AttendanceSessionResponse> {
    const session = await this.getSessionForLifecycleChange(id);
    const actorObjectId = this.toObjectId(actorId, "Authenticated user id is invalid.");

    this.assertCapturesComplete(session);

    const updatedSession = await this.attendanceSessions.update(id, {
      endedAt: new Date(),
      absentStudents: Math.max(session.totalStudents - session.recognizedStudents, 0),
      status: "COMPLETED",
      updatedBy: actorObjectId
    });

    if (!updatedSession) {
      throw new NotFoundError("Attendance session was not found.");
    }

    return this.toResponse(updatedSession);
  }

  async cancel(id: string, actorId: string): Promise<AttendanceSessionResponse> {
    await this.getSessionForLifecycleChange(id);

    const actorObjectId = this.toObjectId(actorId, "Authenticated user id is invalid.");
    const updatedSession = await this.attendanceSessions.update(id, {
      endedAt: new Date(),
      status: "CANCELLED",
      updatedBy: actorObjectId
    });

    if (!updatedSession) {
      throw new NotFoundError("Attendance session was not found.");
    }

    return this.toResponse(updatedSession);
  }

  async findAll(): Promise<AttendanceSessionListResponse> {
    const sessions = await this.attendanceSessions.findAll();

    return {
      attendanceSessions: sessions.map((session) => this.toResponse(session))
    };
  }

  async findById(id: string): Promise<AttendanceSessionResponse> {
    this.assertValidId(id, "Attendance session id is invalid.");

    const session = await this.attendanceSessions.findById(id);

    if (!session) {
      throw new NotFoundError("Attendance session was not found.");
    }

    return this.toResponse(session);
  }

  private async getSessionForLifecycleChange(id: string): Promise<AttendanceSessionDocument> {
    this.assertValidId(id, "Attendance session id is invalid.");

    const session = await this.attendanceSessions.findById(id);

    if (!session) {
      throw new NotFoundError("Attendance session was not found.");
    }

    if (session.status !== "ACTIVE") {
      throw new ConflictError("Only active attendance sessions can be updated.");
    }

    return session;
  }

  private async createSession(input: Parameters<typeof this.attendanceSessions.create>[0]): Promise<AttendanceSessionDocument> {
    try {
      return await this.attendanceSessions.create(input);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictError("An active attendance session already exists for this lecture schedule on this date.");
      }

      throw error;
    }
  }

  private normalizeSessionDate(value?: string): Date {
    const date = value ? new Date(value) : new Date();

    if (Number.isNaN(date.getTime())) {
      throw new ValidationError("Session date must be a valid date.");
    }

    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private assertCapturesComplete(session: AttendanceSessionDocument): void {
    if (session.captureCount > session.maxCaptures) {
      throw new ConflictError("Capture count cannot exceed max captures.");
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

    throw new ValidationError("Attendance session reference is invalid.");
  }

  private toResponse(session: AttendanceSessionDocument): AttendanceSessionResponse {
    return {
      id: session.id,
      lectureSchedule: this.toLectureScheduleResponse(this.getPopulatedLectureSchedule(session.lectureScheduleId)),
      teacherAssignment: this.toTeacherAssignmentResponse(this.getPopulatedTeacherAssignment(session.teacherAssignmentId)),
      classroom: this.toClassroomResponse(this.getPopulatedClassroom(session.classroomId)),
      teacher: this.toTeacherResponse(this.getPopulatedTeacher(session.teacherId)),
      subject: this.toSubjectResponse(this.getPopulatedSubject(session.subjectId)),
      sessionDate: session.sessionDate.toISOString(),
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt ? session.endedAt.toISOString() : null,
      captureCount: session.captureCount,
      maxCaptures: session.maxCaptures,
      totalStudents: session.totalStudents,
      recognizedStudents: session.recognizedStudents,
      absentStudents: session.absentStudents,
      recognitionStatus: session.recognitionStatus,
      capturedImages: session.capturedImages,
      status: session.status,
      createdBy: session.createdBy.toString(),
      updatedBy: session.updatedBy.toString(),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString()
    };
  }

  private getPopulatedLectureSchedule(value: unknown): LectureScheduleDocument {
    if (typeof value === "object" && value !== null && "dayOfWeek" in value) {
      return value as LectureScheduleDocument;
    }

    throw new ValidationError("Attendance session lecture schedule reference is not populated.");
  }

  private getPopulatedTeacherAssignment(value: unknown): TeacherAssignmentDocument {
    if (typeof value === "object" && value !== null && "academicYear" in value && "teacherId" in value) {
      return value as TeacherAssignmentDocument;
    }

    throw new ValidationError("Attendance session teacher assignment reference is not populated.");
  }

  private getPopulatedClassroom(value: unknown): ClassroomDocument {
    if (typeof value === "object" && value !== null && "capacity" in value) {
      return value as ClassroomDocument;
    }

    throw new ValidationError("Attendance session classroom reference is not populated.");
  }

  private getPopulatedTeacher(value: unknown): TeacherDocument {
    if (typeof value === "object" && value !== null && "employeeId" in value) {
      return value as TeacherDocument;
    }

    throw new ValidationError("Attendance session teacher reference is not populated.");
  }

  private getPopulatedSubject(value: unknown): SubjectDocument {
    if (typeof value === "object" && value !== null && "subjectCode" in value) {
      return value as SubjectDocument;
    }

    throw new ValidationError("Attendance session subject reference is not populated.");
  }

  private toLectureScheduleResponse(schedule: LectureScheduleDocument & LectureSchedule): AttendanceSessionLectureScheduleResponse {
    return {
      id: schedule.id,
      academicYear: schedule.academicYear,
      semester: schedule.semester,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      status: schedule.status
    };
  }

  private toTeacherAssignmentResponse(
    teacherAssignment: TeacherAssignmentDocument & TeacherAssignment
  ): AttendanceSessionTeacherAssignmentResponse {
    return {
      id: teacherAssignment.id,
      academicYear: teacherAssignment.academicYear,
      status: teacherAssignment.status
    };
  }

  private toClassroomResponse(classroom: ClassroomDocument & Classroom): AttendanceSessionClassroomResponse {
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

  private toTeacherResponse(teacher: TeacherDocument & Teacher): AttendanceSessionTeacherResponse {
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

  private toSubjectResponse(subject: SubjectDocument & Subject): AttendanceSessionSubjectResponse {
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

  private isDuplicateKeyError(error: unknown): error is { code: number } {
    return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
  }
}

export const attendanceSessionService = new AttendanceSessionService();
