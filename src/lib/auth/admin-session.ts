import type { NextRequest } from "next/server";

const ADMIN_SESSION_COOKIE_NAME = "soft-hub-admin-session";
const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8; // 8 ساعات

export const getAdminSecretOrThrow = () => {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) {
    throw new Error("ADMIN_API_SECRET is not configured");
  }

  return secret;
};

export const isValidAdminSessionValue = (value: string | undefined) => {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret || !value) {
    return false;
  }

  return value === secret;
};

export const isAdminRequestAuthorized = (request: NextRequest) => {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) {
    return false;
  }

  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : header?.trim();
  if (token && token === secret) {
    return true;
  }

  const cookieValue = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (cookieValue && cookieValue === secret) {
    return true;
  }

  return false;
};

export const getAdminSessionCookieOptions = () => ({
  name: ADMIN_SESSION_COOKIE_NAME,
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: ADMIN_SESSION_MAX_AGE,
});

export { ADMIN_SESSION_COOKIE_NAME, ADMIN_SESSION_MAX_AGE };
