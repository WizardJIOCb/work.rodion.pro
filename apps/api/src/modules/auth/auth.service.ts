import { and, eq, gt } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "../../db/client.js";
import { sessions, users, type UserRecord } from "../../db/schema.js";
import { sha256, verifyPassword } from "../../utils/crypto.js";

const sessionLifetimeMs = 1000 * 60 * 60 * 24 * 30;

export type SafeUser = Pick<UserRecord, "id" | "email" | "name" | "isAdmin" | "createdAt">;

function toSafeUser(user: UserRecord): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt,
  };
}

export async function authenticateLocalAdmin(email: string, password: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    return null;
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);

  if (!isPasswordValid) {
    return null;
  }

  return toSafeUser(user);
}

export async function createSession(userId: string) {
  const rawToken = randomUUID();
  const expiresAt = new Date(Date.now() + sessionLifetimeMs);

  await db.insert(sessions).values({
    userId,
    tokenHash: sha256(rawToken),
    expiresAt,
  });

  return { token: rawToken, expiresAt };
}

export async function deleteSession(rawToken: string) {
  await db.delete(sessions).where(eq(sessions.tokenHash, sha256(rawToken)));
}

export async function getUserFromSession(rawToken: string) {
  const [session] = await db
    .select({
      user: users,
      sessionId: sessions.id,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, sha256(rawToken)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (!session) {
    return null;
  }

  return toSafeUser(session.user);
}

