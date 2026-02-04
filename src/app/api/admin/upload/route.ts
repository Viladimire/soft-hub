import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getAdminSecretOrThrow, isAdminRequestAuthorized } from "@/lib/auth/admin-session";
import { uploadImageAssetToGitHub } from "@/lib/services/github/softwareDataStore";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

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
      const status = message.includes("Missing GitHub configuration values") ? 501 : 500;
      return NextResponse.json({ message }, { status });
    }

    console.error("Failed to upload asset", error);
    return NextResponse.json({ message: "Failed to upload asset" }, { status: 500 });
  }
};
