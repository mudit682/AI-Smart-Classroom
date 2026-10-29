import assert from "node:assert/strict";
import test from "node:test";
import { Types } from "mongoose";
import { NotFoundError } from "../../../shared/errors/index.js";
import { AttendanceSessionService } from "./attendance-session.service.js";

const teacherOneId = new Types.ObjectId();
const teacherTwoId = new Types.ObjectId();
const actor = {
  id: "507f1f77bcf86cd799439011",
  userId: "507f1f77bcf86cd799439011",
  email: "teacher.one@example.edu",
  role: "teacher" as const
};

function createSession(teacherId: Types.ObjectId) {
  const sessionId = new Types.ObjectId();
  const now = new Date("2026-10-27T09:00:00.000Z");

  return {
    id: sessionId.toString(),
    lectureScheduleId: {
      id: new Types.ObjectId().toString(),
      academicYear: "2026-27",
      semester: "1",
      dayOfWeek: "MONDAY",
      startTime: "09:00",
      endTime: "10:00",
      status: "ACTIVE"
    },
    teacherAssignmentId: {
      id: new Types.ObjectId().toString(),
      academicYear: "2026-27",
      status: "ACTIVE",
      teacherId
    },
    classroomId: {
      id: new Types.ObjectId().toString(),
      name: "Room 101",
      department: "Computer Science",
      semester: 1,
      section: "A",
      academicYear: "2026-27",
      capacity: 40,
      status: "ACTIVE"
    },
    teacherId: {
      _id: teacherId,
      id: teacherId.toString(),
      employeeId: "T-001",
      name: "Teacher One",
      email: "teacher.one@example.edu",
      department: "Computer Science",
      designation: "Teacher",
      status: "ACTIVE"
    },
    subjectId: {
      id: new Types.ObjectId().toString(),
      subjectCode: "CS101",
      name: "Programming",
      department: "Computer Science",
      semester: 1,
      credits: 4,
      status: "ACTIVE"
    },
    sessionDate: now,
    startedAt: now,
    endedAt: null,
    captureCount: 0,
    maxCaptures: 3,
    totalStudents: 2,
    recognizedStudents: 0,
    absentStudents: 2,
    recognitionStatus: "PENDING",
    capturedImages: [],
    status: "ACTIVE",
    createdBy: teacherOneId,
    updatedBy: teacherOneId,
    createdAt: now,
    updatedAt: now
  };
}

function createService(options: { sessionTeacherId?: Types.ObjectId; scheduleTeacherId?: Types.ObjectId } = {}) {
  const session = createSession(options.sessionTeacherId ?? teacherTwoId);
  const scheduleTeacherId = options.scheduleTeacherId ?? teacherTwoId;
  let requestedTeacherId: Types.ObjectId | undefined;
  const createdSessions: unknown[] = [];
  const updatedSessions: unknown[] = [];
  const attendanceSessions = {
    findByTeacherId: async (teacherId: Types.ObjectId) => {
      requestedTeacherId = teacherId;
      return [];
    },
    findById: async () => session,
    findLectureScheduleById: async () => ({
      classroomId: new Types.ObjectId(),
      teacherAssignmentId: new Types.ObjectId(),
      teacherId: scheduleTeacherId,
      subjectId: new Types.ObjectId(),
      academicYear: "2026-27"
    }),
    findActiveByLectureScheduleAndDate: async () => null,
    countActiveStudentEnrollments: async () => 2,
    create: async (input: unknown) => {
      createdSessions.push(input);
      return { id: session.id };
    },
    update: async (_id: string, input: unknown) => {
      updatedSessions.push(input);
      return session;
    }
  };
  const teachers = {
    findByEmail: async () => ({ _id: teacherOneId, status: "ACTIVE" })
  };

  return {
    service: new AttendanceSessionService(attendanceSessions as never, teachers as never),
    requestedTeacherId: () => requestedTeacherId,
    createdSessions: () => createdSessions,
    updatedSessions: () => updatedSessions,
    session
  };
}

test("teacher history queries only the authenticated teacher profile", async () => {
  const { service, requestedTeacherId } = createService();

  const result = await service.findForTeacher(actor);

  assert.deepEqual(result, { attendanceSessions: [] });
  assert.equal(requestedTeacherId()?.toString(), teacherOneId.toString());
  assert.notEqual(requestedTeacherId()?.toString(), teacherTwoId.toString());
});

test("teacher cannot retrieve another teacher's attendance session by id", async () => {
  const { service } = createService();

  await assert.rejects(service.findById(new Types.ObjectId().toString(), actor), NotFoundError);
});

test("teacher can start a session only for their own lecture schedule", async () => {
  const { service, createdSessions } = createService({ scheduleTeacherId: teacherOneId });

  await service.start({ lectureScheduleId: new Types.ObjectId().toString() }, actor);

  assert.equal(createdSessions().length, 1);
});

test("teacher cannot start a session for another teacher's lecture schedule", async () => {
  const { service, createdSessions } = createService({ scheduleTeacherId: teacherTwoId });

  await assert.rejects(service.start({ lectureScheduleId: new Types.ObjectId().toString() }, actor), NotFoundError);
  assert.equal(createdSessions().length, 0);
});

test("teacher can end and cancel their own active attendance session", async () => {
  const { service, session, updatedSessions } = createService({ sessionTeacherId: teacherOneId });

  await service.end(session.id, actor);
  await service.cancel(session.id, actor);

  assert.equal(updatedSessions().length, 2);
});

test("teacher cannot end or cancel another teacher's attendance session", async () => {
  const { service, session, updatedSessions } = createService({ sessionTeacherId: teacherTwoId });

  await assert.rejects(service.end(session.id, actor), NotFoundError);
  await assert.rejects(service.cancel(session.id, actor), NotFoundError);
  assert.equal(updatedSessions().length, 0);
});
