import assert from "node:assert/strict";
import test from "node:test";
import { Types } from "mongoose";
import { NotFoundError } from "../../../shared/errors/index.js";
import { FaceEnrollmentService } from "../../face-enrollments/services/face-enrollment.service.js";
import { StudentService } from "./student.service.js";
import { TeacherStudentAccessService } from "./teacher-student-access.service.js";

const teacherActor = {
  email: "teacher@example.edu",
  role: "teacher" as const
};

const adminActor = {
  email: "admin@example.edu",
  role: "admin" as const
};

function createStudent(id: Types.ObjectId, name: string) {
  const now = new Date("2026-10-31T09:00:00.000Z");

  return {
    _id: id,
    id: id.toString(),
    name,
    enrollmentNumber: `ENR-${name}`,
    email: `${name.toLowerCase()}@example.edu`,
    department: "Computer Science",
    semester: 1,
    section: "A",
    faceEnrolled: false,
    createdBy: new Types.ObjectId(),
    updatedBy: new Types.ObjectId(),
    createdAt: now,
    updatedAt: now
  };
}

function createFaceEnrollment(id: Types.ObjectId, student: ReturnType<typeof createStudent>) {
  const now = new Date("2026-10-31T09:00:00.000Z");

  return {
    _id: id,
    id: id.toString(),
    studentId: student,
    enrollmentStatus: "NOT_STARTED" as const,
    faceImages: [],
    totalImages: 0,
    requiredImages: 10,
    embeddingGenerated: false,
    embeddingVersion: "",
    lastEnrolledAt: null,
    createdBy: new Types.ObjectId(),
    updatedBy: new Types.ObjectId(),
    createdAt: now,
    updatedAt: now
  };
}

test("teacher classroom scope uses active assignments and matching active enrollments", async () => {
  const teacherId = new Types.ObjectId();
  const classroomId = new Types.ObjectId();
  const expectedStudentId = new Types.ObjectId();
  let requestedTeacherId: Types.ObjectId | undefined;
  let requestedAssignments: unknown;
  const service = new TeacherStudentAccessService(
    {
      findByEmail: async () => ({ _id: teacherId, status: "ACTIVE" })
    } as never,
    {
      findActiveClassroomAssignmentsByTeacherId: async (id: Types.ObjectId) => {
        requestedTeacherId = id;
        return [{ classroomId, academicYear: "2026-27" }];
      }
    } as never,
    {
      findActiveStudentIdsByClassroomAssignments: async (assignments: unknown) => {
        requestedAssignments = assignments;
        return [expectedStudentId];
      }
    } as never
  );

  const studentIds = await service.findAccessibleStudentIdsByTeacherEmail(teacherActor.email);

  assert.deepEqual(studentIds, [expectedStudentId]);
  assert.equal(requestedTeacherId?.toString(), teacherId.toString());
  assert.deepEqual(requestedAssignments, [{ classroomId, academicYear: "2026-27" }]);
});

test("teacher lists only students enrolled in assigned classrooms and can read an assigned student", async () => {
  const assignedStudent = createStudent(new Types.ObjectId(), "Assigned");
  const otherStudent = createStudent(new Types.ObjectId(), "Other");
  let requestedIds: Types.ObjectId[] | undefined;
  const service = new StudentService(
    {
      findByIds: async (ids: Types.ObjectId[]) => {
        requestedIds = ids;
        return [assignedStudent];
      },
      findById: async (id: string) => (id === assignedStudent.id ? assignedStudent : otherStudent),
      findAll: async () => [assignedStudent, otherStudent]
    } as never,
    {
      findAccessibleStudentIdsByTeacherEmail: async () => [assignedStudent._id]
    }
  );

  const listResult = await service.findAll(teacherActor);
  const detailResult = await service.findById(assignedStudent.id, teacherActor);

  assert.deepEqual(requestedIds, [assignedStudent._id]);
  assert.deepEqual(listResult.students.map((student) => student.id), [assignedStudent.id]);
  assert.equal(detailResult.id, assignedStudent.id);
});

test("teacher cannot read a student outside their assigned classrooms", async () => {
  const assignedStudent = createStudent(new Types.ObjectId(), "Assigned");
  const otherStudent = createStudent(new Types.ObjectId(), "Other");
  const service = new StudentService(
    {
      findById: async () => otherStudent
    } as never,
    {
      findAccessibleStudentIdsByTeacherEmail: async () => [assignedStudent._id]
    }
  );

  await assert.rejects(service.findById(otherStudent.id, teacherActor), NotFoundError);
});

test("admin retains unrestricted student access", async () => {
  const firstStudent = createStudent(new Types.ObjectId(), "First");
  const secondStudent = createStudent(new Types.ObjectId(), "Second");
  const service = new StudentService(
    {
      findAll: async () => [firstStudent, secondStudent],
      findById: async () => secondStudent
    } as never,
    {
      findAccessibleStudentIdsByTeacherEmail: async () => {
        throw new Error("Admin access must not resolve a teacher scope.");
      }
    }
  );

  const listResult = await service.findAll(adminActor);
  const detailResult = await service.findById(secondStudent.id, adminActor);

  assert.equal(listResult.students.length, 2);
  assert.equal(detailResult.id, secondStudent.id);
});

test("teacher lists and reads only face enrollments for assigned students", async () => {
  const assignedStudent = createStudent(new Types.ObjectId(), "Assigned");
  const otherStudent = createStudent(new Types.ObjectId(), "Other");
  const assignedEnrollment = createFaceEnrollment(new Types.ObjectId(), assignedStudent);
  const otherEnrollment = createFaceEnrollment(new Types.ObjectId(), otherStudent);
  let requestedIds: Types.ObjectId[] | undefined;
  const service = new FaceEnrollmentService(
    {
      findByStudentIds: async (ids: Types.ObjectId[]) => {
        requestedIds = ids;
        return [assignedEnrollment];
      },
      findById: async (id: string) => (id === assignedEnrollment.id ? assignedEnrollment : otherEnrollment)
    } as never,
    undefined,
    undefined,
    {
      findAccessibleStudentIdsByTeacherEmail: async () => [assignedStudent._id]
    }
  );

  const listResult = await service.findAll({ userId: new Types.ObjectId().toString(), ...teacherActor });
  const detailResult = await service.findById(assignedEnrollment.id, {
    userId: new Types.ObjectId().toString(),
    ...teacherActor
  });

  assert.deepEqual(requestedIds, [assignedStudent._id]);
  assert.deepEqual(listResult, {
    faceEnrollments: [
      {
        id: assignedEnrollment.id,
        student: { id: assignedStudent.id },
        enrollmentStatus: "NOT_STARTED",
        imageCount: 0
      }
    ]
  });
  assert.deepEqual(detailResult, {
    id: assignedEnrollment.id,
    student: { id: assignedStudent.id },
    enrollmentStatus: "NOT_STARTED",
    imageCount: 0
  });
});

test("teacher cannot read another teacher's face enrollment and admin retains access", async () => {
  const assignedStudent = createStudent(new Types.ObjectId(), "Assigned");
  const otherStudent = createStudent(new Types.ObjectId(), "Other");
  const otherEnrollment = createFaceEnrollment(new Types.ObjectId(), otherStudent);
  const service = new FaceEnrollmentService(
    {
      findById: async () => otherEnrollment,
      findAll: async () => [otherEnrollment]
    } as never,
    undefined,
    undefined,
    {
      findAccessibleStudentIdsByTeacherEmail: async () => [assignedStudent._id]
    }
  );

  await assert.rejects(
    service.findById(otherEnrollment.id, { userId: new Types.ObjectId().toString(), ...teacherActor }),
    NotFoundError
  );

  const adminResult = await service.findById(otherEnrollment.id, {
    userId: new Types.ObjectId().toString(),
    ...adminActor
  });

  assert.equal(adminResult.id, otherEnrollment.id);
  assert.ok("faceImages" in adminResult);
  assert.ok("embeddingVersion" in adminResult);
});
