import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getAdminSecretOrThrow, isAdminRequestAuthorized } from "@/lib/auth/admin-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";

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

const guessExtension = (mime: string) => {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "bin";
};

const ensureStorageBucket = async (bucket: string) => {
  if (!supabaseConfig.serviceRoleKey) {
    throw new Error(
      "Supabase Storage requires SUPABASE_SERVICE_ROLE_KEY to create/manage buckets automatically. Set it in env and try again.",
    );
  }

  const supabase = createSupabaseServerClient();

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    throw new Error(
      "Failed to list buckets from Supabase Storage. Check SUPABASE_SERVICE_ROLE_KEY and Storage permissions in the project.",
    );
  }

  const exists = (buckets ?? []).some((item) => item.name === bucket);
  if (exists) return;

  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: MAX_IMAGE_BYTES,
  });

  if (createError) {
    throw new Error(
      "Failed to create the bucket automatically. Create a bucket named software-images and make it public (or set SUPABASE_STORAGE_BUCKET).",
    );
  }
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

    const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "software-images";

    await ensureStorageBucket(bucket);

    const supabase = createSupabaseServerClient();

    const ext = guessExtension(file.type);
    const path = `admin/${parsed.type}/${randomUUID()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, buffer, {
      contentType: file.type,
      upsert: false,
      cacheControl: "31536000",
    });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);

    return NextResponse.json({ url: data.publicUrl, path, bucket });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation failed", errors: error.flatten() }, { status: 400 });
    }

    if (error instanceof Error) {
      const message = error.message || "Failed to upload asset";
      const status = message.includes("SUPABASE_SERVICE_ROLE_KEY") ? 501 : 500;
      return NextResponse.json({ message }, { status });
    }

    console.error("Failed to upload asset", error);
    return NextResponse.json({ message: "Failed to upload asset" }, { status: 500 });
  }
};
