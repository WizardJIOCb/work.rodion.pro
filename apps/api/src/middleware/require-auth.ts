import type { NextFunction, Request, Response } from "express";
import { readCookie } from "../utils/cookies.js";
import { getUserFromSession, type SafeUser } from "../modules/auth/auth.service.js";

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
    }
  }
}

export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  const token = readCookie(request.headers.cookie, "work_rodion_session");

  if (!token) {
    return response.status(401).json({
      message: "Authentication required.",
    });
  }

  const user = await getUserFromSession(token);

  if (!user) {
    return response.status(401).json({
      message: "Session is missing or expired.",
    });
  }

  request.user = user;
  next();
}

