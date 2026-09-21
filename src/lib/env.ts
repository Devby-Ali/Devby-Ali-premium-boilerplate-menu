import { z } from "zod";

/**
 * Schema for validating environment variables at build/runtime.
 * All values have safe defaults for development; in production they MUST be set.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z
    .string()
    .trim()
    .min(1)
    .default("mongodb://localhost:27017/premium-boilerplate-menu"),
  JWT_SECRET: z
    .string()
    .trim()
    .min(16, "JWT_SECRET must be at least 16 characters")
    .default("premium-menu-dev-secret"),
  NEXT_PUBLIC_API_BASE_URL: z.string().trim().min(1).default("/api"),
  APP_URL: z.string().trim().url().default("http://localhost:3000"),
  ADMIN_INITIAL_EMAIL: z
    .string()
    .trim()
    .email()
    .default("admin@premiummenu.test"),
  ADMIN_INITIAL_PASSWORD: z.string().trim().min(4).default("admin1234"),
});

const parsedEnv = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  APP_URL: process.env.APP_URL,
  ADMIN_INITIAL_EMAIL: process.env.ADMIN_INITIAL_EMAIL,
  ADMIN_INITIAL_PASSWORD: process.env.ADMIN_INITIAL_PASSWORD,
});

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid environment configuration: ${issues}`);
}

export const env = parsedEnv.data;
