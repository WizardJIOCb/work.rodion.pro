import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { requireAuth } from "../../middleware/require-auth.js";
import {
  clearSessionCookie,
  readCookie,
  setSessionCookie,
  shouldUseSecureCookies,
} from "../../utils/cookies.js";
import {
  authenticateLocalAdmin,
  createSession,
  deleteSession,
} from "./auth.service.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRouter = Router();
const useSecureCookies = shouldUseSecureCookies(env.APP_URL);

authRouter.post("/login", async (request, response) => {
  const parsed = loginSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({
      message: "Invalid login payload.",
      issues: parsed.error.flatten(),
    });
  }

  const user = await authenticateLocalAdmin(parsed.data.email, parsed.data.password);

  if (!user) {
    return response.status(401).json({
      message: "Invalid email or password.",
    });
  }

  const session = await createSession(user.id);
  setSessionCookie(response, session.token, useSecureCookies);

  return response.json({
    user,
  });
});

authRouter.post("/logout", async (request, response) => {
  const token = readCookie(request.headers.cookie, "work_rodion_session");

  if (token) {
    await deleteSession(token);
  }

  clearSessionCookie(response, useSecureCookies);

  return response.status(204).send();
});

authRouter.get("/me", requireAuth, (request, response) => {
  return response.json({
    user: request.user,
  });
});
