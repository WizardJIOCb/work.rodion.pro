import { existsSync } from "node:fs";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

const envCandidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../../.env"),
  path.resolve(process.cwd(), "../../../.env"),
];

const envPath = envCandidates.find((candidate) => existsSync(candidate));

if (envPath) {
  loadDotenv({ path: envPath, override: true });
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3010),
  APP_URL: z.string().url().default("http://localhost:5173"),
  API_URL: z.string().url().default("http://localhost:3010/api"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 characters"),
  AUTH_MODE: z.enum(["local"]).default("local"),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD_HASH: z.string().min(1, "ADMIN_PASSWORD_HASH is required"),
  ACTION_SCRIPTS_DIR: z.string().min(1).default("/opt/work-rodion/actions"),
  ACTION_RUN_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
});

export const env = envSchema.parse(process.env);
