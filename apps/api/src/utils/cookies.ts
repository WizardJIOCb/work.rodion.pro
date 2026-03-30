import type { Response } from "express";

const oneDayInSeconds = 60 * 60 * 24;

export function serializeCookie(
  name: string,
  value: string,
  options: {
    maxAge?: number;
    httpOnly?: boolean;
    secure?: boolean;
    path?: string;
    sameSite?: "Strict" | "Lax" | "None";
  } = {},
) {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  parts.push(`Path=${options.path ?? "/"}`);
  parts.push(`SameSite=${options.sameSite ?? "Lax"}`);

  if (options.httpOnly ?? true) {
    parts.push("HttpOnly");
  }

  if (options.secure) {
    parts.push("Secure");
  }

  if (typeof options.maxAge === "number") {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  return parts.join("; ");
}

export function setSessionCookie(response: Response, value: string, secure: boolean) {
  response.setHeader(
    "Set-Cookie",
    serializeCookie("work_rodion_session", value, {
      maxAge: oneDayInSeconds * 30,
      secure,
    }),
  );
}

export function clearSessionCookie(response: Response, secure: boolean) {
  response.setHeader(
    "Set-Cookie",
    serializeCookie("work_rodion_session", "", {
      maxAge: 0,
      secure,
    }),
  );
}

export function shouldUseSecureCookies(appUrl: string) {
  try {
    return new URL(appUrl).protocol === "https:";
  } catch {
    return false;
  }
}

export function readCookie(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((item) => item.trim());
  const entry = cookies.find((item) => item.startsWith(`${name}=`));

  if (!entry) {
    return null;
  }

  return decodeURIComponent(entry.slice(name.length + 1));
}
