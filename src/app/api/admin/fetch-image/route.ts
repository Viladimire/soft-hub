import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getAdminSecretOrThrow, isAdminRequestAuthorized } from "@/lib/auth/admin-session";

const querySchema = z.object({
  url: z.string().url(),
});

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const ensureAuthorized = (request: NextRequest) => {
  try {
    getAdminSecretOrThrow();
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "ADMIN_API_SECRET is not configured" },
      { status: 501 },
    );
  }

  if (!isAdminRequestAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return null;
};

export const GET = async (request: NextRequest) => {
  const unauthorized = ensureAuthorized(request);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.parse({ url: searchParams.get("url") ?? "" });

    const upstream = await fetch(parsed.url, {
      redirect: "follow",
      cache: "no-store",
      headers: {
        "user-agent": "soft-hub-admin-image-proxy",
        accept: "image/*,*/*;q=0.8",
      },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { message: `Failed to fetch image (${upstream.status})` },
        { status: 400 },
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ message: "URL did not return an image" }, { status: 400 });
    }

    const contentLength = Number(upstream.headers.get("content-length") ?? 0);
    if (contentLength && contentLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ message: "Image is too large" }, { status: 400 });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ message: "Image is too large" }, { status: 400 });
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid url" }, { status: 400 });
    }

    console.error("Failed to proxy image", error);
    return NextResponse.json({ message: "Failed to fetch image" }, { status: 500 });
  }
};
