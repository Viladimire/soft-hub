import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  getAdminSecretOrThrow,
  getAdminSessionCookieOptions,
  isValidAdminSessionValue,
} from "@/lib/auth/admin-session";

const loginSchema = z.object({
  token: z.string().min(1),
});

export const POST = async (request: NextRequest) => {
  try {
    const secret = getAdminSecretOrThrow();
    const payload = await request.json();
    const { token } = loginSchema.parse(payload);

    if (token !== secret) {
      return NextResponse.json({ message: "Invalid access token" }, { status: 401 });
    }

    const cookie = getAdminSessionCookieOptions();
    const response = NextResponse.json({ message: "Signed in" });
    response.cookies.set(cookie.name, secret, cookie);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_API_SECRET is not configured") {
      return NextResponse.json(
        { message: "Admin panel is disabled: ADMIN_API_SECRET is not configured on the server" },
        { status: 501 },
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid request payload" }, { status: 400 });
    }

    console.error("Failed to create admin session", error);
    return NextResponse.json({ message: "Failed to create session" }, { status: 500 });
  }
};

export const DELETE = async () => {
  const secret = process.env.ADMIN_API_SECRET;

  if (!secret) {
    // If the secret is not configured we can simply respond without mutating cookies.
    return NextResponse.json({ message: "Signed out" }, { status: 200 });
  }

  const cookie = getAdminSessionCookieOptions();
  const response = NextResponse.json({ message: "Signed out" });
  response.cookies.set(cookie.name, "", { ...cookie, maxAge: 0 });
  return response;
};

export const GET = async (request: NextRequest) => {
  const cookie = request.cookies.get("soft-hub-admin-session")?.value;
  if (!isValidAdminSessionValue(cookie)) {
    return NextResponse.json({ authorized: false }, { status: 401 });
  }

  return NextResponse.json({ authorized: true });
};
