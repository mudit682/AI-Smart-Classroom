import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { env } from "../src/config/env.js";
import { authService } from "../src/modules/auth/services/auth.service.js";
import { TeacherModel } from "../src/modules/teachers/models/teacher.model.js";
import { UserModel, type UserDocument } from "../src/modules/users/user.model.js";

type DevelopmentAccount = {
  name: string;
  email: string;
  password: string;
};

type DevelopmentTeacher = DevelopmentAccount & {
  employeeId: string;
  department: string;
  designation: string;
};

async function main(): Promise<void> {
  assertLocalDevelopmentDatabase();

  const admin = readDevelopmentAccount("DEV_ADMIN");
  const teacher = readDevelopmentTeacher();

  if (admin.email === teacher.email) {
    throw new Error("DEV_ADMIN_EMAIL and DEV_TEACHER_EMAIL must be different.");
  }

  await mongoose.connect(env.MONGODB_URI);

  try {
    const adminUser = await ensureDevelopmentAdmin(admin);
    await ensureActiveTeacherProfile(teacher, adminUser);
    await ensureTeacherLogin(teacher);

    console.log("Local development authentication setup completed.");
    console.log(`Development admin email: ${admin.email}`);
    console.log(`Development teacher email: ${teacher.email}`);
  } finally {
    await mongoose.disconnect();
  }
}

function assertLocalDevelopmentDatabase(): void {
  if (env.NODE_ENV !== "development") {
    throw new Error("Local development authentication setup requires NODE_ENV=development.");
  }

  const databaseUrl = new URL(env.MONGODB_URI);
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

  if (databaseUrl.protocol !== "mongodb:" || !localHosts.has(databaseUrl.hostname) || databaseUrl.pathname !== "/ai-smart-classroom") {
    throw new Error("Local development authentication setup only supports mongodb://localhost/ai-smart-classroom.");
  }
}

function readDevelopmentAccount(prefix: "DEV_ADMIN" | "DEV_TEACHER"): DevelopmentAccount {
  const name = requiredEnvironmentVariable(`${prefix}_NAME`);
  const email = requiredEnvironmentVariable(`${prefix}_EMAIL`).toLowerCase();
  const password = requiredEnvironmentVariable(`${prefix}_PASSWORD`);

  if (!isValidEmail(email)) {
    throw new Error(`${prefix}_EMAIL must be a valid email address.`);
  }

  if (password.length < 8) {
    throw new Error(`${prefix}_PASSWORD must be at least 8 characters long.`);
  }

  return { name, email, password };
}

function readDevelopmentTeacher(): DevelopmentTeacher {
  return {
    ...readDevelopmentAccount("DEV_TEACHER"),
    employeeId: requiredEnvironmentVariable("DEV_TEACHER_EMPLOYEE_ID").toUpperCase(),
    department: requiredEnvironmentVariable("DEV_TEACHER_DEPARTMENT"),
    designation: requiredEnvironmentVariable("DEV_TEACHER_DESIGNATION")
  };
}

async function ensureDevelopmentAdmin(account: DevelopmentAccount): Promise<UserDocument> {
  const existingUser = await UserModel.findOne({ email: account.email }).select("+passwordHash").exec();

  if (existingUser) {
    if (existingUser.role !== "admin") {
      throw new Error("DEV_ADMIN_EMAIL already belongs to a non-admin user.");
    }

    if (!(await bcrypt.compare(account.password, existingUser.passwordHash))) {
      throw new Error("The configured development admin password does not match the existing account.");
    }

    return existingUser;
  }

  return UserModel.create({
    name: account.name,
    email: account.email,
    passwordHash: await bcrypt.hash(account.password, env.BCRYPT_SALT_ROUNDS),
    role: "admin",
    isVerified: true
  });
}

async function ensureActiveTeacherProfile(teacher: DevelopmentTeacher, admin: UserDocument): Promise<void> {
  const existingTeacher = await TeacherModel.findOne({ email: teacher.email }).exec();

  if (existingTeacher) {
    if (existingTeacher.status !== "ACTIVE") {
      existingTeacher.status = "ACTIVE";
      existingTeacher.updatedBy = admin._id;
      await existingTeacher.save();
    }

    return;
  }

  const employeeIdInUse = await TeacherModel.exists({ employeeId: teacher.employeeId }).exec();

  if (employeeIdInUse) {
    throw new Error("DEV_TEACHER_EMPLOYEE_ID already belongs to another teacher profile.");
  }

  await TeacherModel.create({
    employeeId: teacher.employeeId,
    name: teacher.name,
    email: teacher.email,
    department: teacher.department,
    designation: teacher.designation,
    status: "ACTIVE",
    createdBy: admin._id,
    updatedBy: admin._id
  });
}

async function ensureTeacherLogin(teacher: DevelopmentTeacher): Promise<void> {
  const existingUser = await UserModel.findOne({ email: teacher.email }).select("+passwordHash").exec();

  if (existingUser) {
    if (existingUser.role !== "teacher") {
      throw new Error("DEV_TEACHER_EMAIL already belongs to a non-teacher user.");
    }

    if (!(await bcrypt.compare(teacher.password, existingUser.passwordHash))) {
      throw new Error("The configured development teacher password does not match the existing account.");
    }

    return;
  }

  await authService.createTeacherAccount({
    email: teacher.email,
    password: teacher.password
  });
}

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} must be configured in the local backend environment.`);
  }

  return value;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Local development authentication setup failed.");
  process.exitCode = 1;
});
