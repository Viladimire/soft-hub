import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getAdminSecretOrThrow, isAdminRequestAuthorized } from "@/lib/auth/admin-session";
import { uploadImageAssetToGitHub } from "@/lib/services/github/softwareDataStore";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
// GitHub Contents API has strict payload limits and the upload uses base64.
// Base64 expands size by ~4/3, so a raw 900KB image can exceed GitHub's cap after encoding.
// Keep this conservative to avoid opaque 500s.
const GITHUB_CONTENTS_SOFT_LIMIT_BYTES = 700 * 1024;
const estimateBase64Size = (rawBytes: number) => Math.ceil((rawBytes / 3) * 4);

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

    const base64Bytes = estimateBase64Size(bytes.length);
    if (bytes.length > GITHUB_CONTENTS_SOFT_LIMIT_BYTES || base64Bytes > 950 * 1024) {
      return NextResponse.json(
        {
          message: "Image is too large after processing. Please upload a smaller image.",
          bytes: bytes.length,
          base64Bytes,
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
      const githubStatusMatch = message.match(/GitHub API request failed \((\d+)\):/i);
      const githubStatus = githubStatusMatch ? Number(githubStatusMatch[1]) : null;

      const isNetworkError =
        error.name === "TypeError" ||
        /fetch\s*failed|network|econnreset|etimedout|enotfound|socket|tls|certificate|handshake/i.test(message);

      const isGitHubSizeError = /too\s*large|maximum\s*file\s*size|content\s*too\s*large|413/i.test(message);
      const isAuthError = githubStatus === 401 || githubStatus === 403;
      const isNotFound = githubStatus === 404;

      const status = (() => {
        if (message.includes("Missing GitHub configuration values")) return 501;
        if (isGitHubSizeError) return 413;
        if (isAuthError || isNotFound) return 502;
        if (isNetworkError) return 502;
        return 500;
      })();

      const hint = (() => {
        if (isGitHubSizeError) return "Try a smaller image (GitHub has a strict file size limit for this upload path).";
        if (isAuthError) return "GitHub token is missing/invalid or lacks permissions (check GITHUB_CONTENT_TOKEN + repo access).";
        if (isNotFound) return "GitHub repo/path not found (check GITHUB_DATA_REPO_OWNER/NAME/BRANCH).";
        if (isNetworkError) return "GitHub API request failed due to a network error. Check Vercel outbound connectivity and GitHub availability.";
        return undefined;
      })();

      return NextResponse.json(
        {
          message,
          hint,
          debug: {
            githubStatus: githubStatus ?? undefined,
            provider: "github",
          },
        },
        { status },
      );
    }

    console.error("Failed to upload asset", error);
    return NextResponse.json({ message: "Failed to upload asset" }, { status: 500 });
  }
};
