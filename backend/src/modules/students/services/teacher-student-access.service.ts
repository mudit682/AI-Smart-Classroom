import type { Types } from "mongoose";
import { AppError, NotFoundError } from "../../../shared/errors/index.js";
import { studentEnrollmentRepository } from "../../student-enrollments/repositories/student-enrollment.repository.js";
import { teacherAssignmentRepository } from "../../teacher-assignments/repositories/teacher-assignment.repository.js";
import { teacherRepository } from "../../teachers/repositories/teacher.repository.js";

export interface TeacherStudentAccess {
  findAccessibleStudentIdsByTeacherEmail(email: string): Promise<Types.ObjectId[]>;
}

export class TeacherStudentAccessService implements TeacherStudentAccess {
  constructor(
    private readonly teachers = teacherRepository,
    private readonly teacherAssignments = teacherAssignmentRepository,
    private readonly studentEnrollments = studentEnrollmentRepository
  ) {}

  async findAccessibleStudentIdsByTeacherEmail(email: string): Promise<Types.ObjectId[]> {
    const teacher = await this.teachers.findByEmail(email.toLowerCase());

    if (!teacher) {
      throw new NotFoundError("Teacher profile was not found.");
    }

    if (teacher.status !== "ACTIVE") {
      throw new AppError("Teacher profile is inactive.", 403, { code: "AUTHORIZATION_ERROR" });
    }

    const assignments = await this.teacherAssignments.findActiveClassroomAssignmentsByTeacherId(teacher._id);

    return this.studentEnrollments.findActiveStudentIdsByClassroomAssignments(assignments);
  }
}

export const teacherStudentAccessService = new TeacherStudentAccessService();
