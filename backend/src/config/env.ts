import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 5000),
  API_PREFIX: process.env.API_PREFIX ?? "/api/v1",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  MONGODB_URI: required("MONGODB_URI", "mongodb://localhost:27017/ai-smart-classroom"),
  JWT_ACCESS_SECRET: required("JWT_ACCESS_SECRET", "replace-with-strong-access-secret"),
  JWT_REFRESH_SECRET: required("JWT_REFRESH_SECRET", "replace-with-strong-refresh-secret"),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  BCRYPT_SALT_ROUNDS: Number(process.env.BCRYPT_SALT_ROUNDS ?? 12),
  UPLOAD_DIR: process.env.UPLOAD_DIR ?? "uploads",
  AI_SERVICE_BASE_URL: process.env.AI_SERVICE_BASE_URL ?? "http://localhost:8000",
  FACE_ENROLLMENT_MAX_FILE_SIZE_MB: Number(process.env.FACE_ENROLLMENT_MAX_FILE_SIZE_MB ?? 10),
  FACE_ENROLLMENT_MAX_UPLOADS: Number(process.env.FACE_ENROLLMENT_MAX_UPLOADS ?? 10)
} as const;
