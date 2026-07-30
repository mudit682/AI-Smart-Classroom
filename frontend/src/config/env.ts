import { z } from "zod";

const envSchema = z.object({
  VITE_APP_NAME: z.string().default("AI Smart Classroom"),
  VITE_API_BASE_URL: z.string().url(),
  VITE_AI_SERVICE_BASE_URL: z.string().url()
});

export const env = envSchema.parse(import.meta.env);

