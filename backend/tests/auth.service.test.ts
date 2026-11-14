import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcrypt";
import { ConflictError, NotFoundError } from "../src/shared/errors/index.js";
import { AuthService } from "../src/modules/auth/services/auth.service.js";
import { validateRegister } from "../src/modules/auth/validators/auth.validators.js";

const now = new Date("2026-10-16T00:00:00.000Z");

function createService(options: { teacher?: { name: string; email: string; status: "ACTIVE" | "INACTIVE" }; userExists?: boolean } = {}) {
  let createdUser: { name: string; email: string; passwordHash: string; role: string } | undefined;
  const users = {
    existsByEmail: async () => options.userExists ?? false,
    create: async (user: { name: string; email: string; passwordHash: string; role: string }) => {
      createdUser = user;
      return {
        ...user,
        id: "507f1f77bcf86cd799439011",
        isVerified: false,
        createdAt: now,
        updatedAt: now
      };
    }
  };
  const teachers = {
    findByEmail: async () => options.teacher ?? null
  };

  return {
    service: new AuthService(users as never, {} as never, teachers as never),
    getCreatedUser: () => createdUser
  };
}

test("creates a teacher account only from an active teacher profile", async () => {
  const { service, getCreatedUser } = createService({
    teacher: { name: "Teacher One", email: "teacher@example.edu", status: "ACTIVE" }
  });

  const result = await service.createTeacherAccount({
    email: "TEACHER@example.edu",
    password: "secure-password"
  });

  const createdUser = getCreatedUser();
  assert.equal(result.user.role, "teacher");
  assert.equal(result.user.name, "Teacher One");
  assert.equal(createdUser?.email, "teacher@example.edu");
  assert.equal(createdUser?.role, "teacher");
  assert.ok(createdUser);
  assert.equal(await bcrypt.compare("secure-password", createdUser.passwordHash), true);
});

test("rejects a teacher account when the teacher profile does not exist", async () => {
  const { service } = createService();

  await assert.rejects(
    service.createTeacherAccount({ email: "teacher@example.edu", password: "secure-password" }),
    NotFoundError
  );
});

test("rejects a duplicate teacher account email", async () => {
  const { service } = createService({
    teacher: { name: "Teacher One", email: "teacher@example.edu", status: "ACTIVE" },
    userExists: true
  });

  await assert.rejects(
    service.createTeacherAccount({ email: "teacher@example.edu", password: "secure-password" }),
    ConflictError
  );
});

test("rejects a role field on the registration payload", () => {
  let validationError: unknown;
  validateRegister(
    { body: { name: "Student One", email: "student@example.edu", password: "secure-password", role: "admin" } } as never,
    {} as never,
    (error?: unknown) => {
      validationError = error;
    }
  );

  assert.ok(validationError instanceof Error);
  assert.equal(validationError.message, "Registration payload contains unsupported fields.");
});
