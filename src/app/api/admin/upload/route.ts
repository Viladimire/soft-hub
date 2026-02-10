import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getAdminSecretOrThrow, isAdminRequestAuthorized } from "@/lib/auth/admin-session";
import { uploadImageAssetToGitHub } from "@/lib/services/github/softwareDataStore";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const GITHUB_CONTENTS_SOFT_LIMIT_BYTES = 900 * 1024;

const bodySchema = z.object({
  type: z.enum(["logo", "hero", "screenshot"]),
});

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

export const POST = async (request: NextRequest) => {
  const unauthorized = ensureAuthorized(request);
  if (unauthorized) return unauthorized;

  try {
    const form = await request.formData();
    const file = form.get("file");
    const type = form.get("type");

    const parsed = bodySchema.parse({ type });

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "File is required" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ message: "Only image uploads are supported" }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ message: "File is too large" }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());

    if (bytes.length > GITHUB_CONTENTS_SOFT_LIMIT_BYTES) {
      return NextResponse.json(
        {
          message: "Image is too large after processing. Please upload a smaller image.",
          bytes: bytes.length,
          limit: GITHUB_CONTENTS_SOFT_LIMIT_BYTES,
        },
        { status: 413 },
      );
    }

    const { url, path } = await uploadImageAssetToGitHub({
      bytes,
      mime: file.type,
      type: parsed.type,
      filenameBase: randomUUID(),
    });

    return NextResponse.json({ url, path, provider: "github" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation failed", errors: error.flatten() }, { status: 400 });
    }

    if (error instanceof Error) {
      const message = error.message || "Failed to upload asset";
      const isGitHubSizeError = /too\s*large|maximum\s*file\s*size|content\s*too\s*large|413/i.test(message);
      const status = message.includes("Missing GitHub configuration values") ? 501 : 500;
      return NextResponse.json(
        {
          message,
          hint: isGitHubSizeError ? "Try a smaller image (GitHub has a strict file size limit for this upload path)." : undefined,
        },
        { status: isGitHubSizeError ? 413 : status },
      );
    }

    console.error("Failed to upload asset", error);
    return NextResponse.json({ message: "Failed to upload asset" }, { status: 500 });
  }
};
