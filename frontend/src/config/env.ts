import { z } from "zod";

const envSchema = z.object({
  VITE_APP_NAME: z.string().default("AI Smart Classroom"),
  VITE_API_BASE_URL: z.string().url().default("http://127.0.0.1:5000/api/v1")
});

export const env = envSchema.parse(import.meta.env);
