import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { isAdminRequestAuthorized } from "@/lib/auth/admin-session";
import { readLocalAdminConfig } from "@/lib/services/local-admin-config";
import {
  deleteSoftwareFromGitHub,
  GitHubConfigError,
  publishLatestSoftwarePagesToGitHub,
  saveSoftwareToGitHub,
} from "@/lib/services/github/softwareDataStore";
import { softwareSchema } from "@/lib/validations/software.schema";
import type { Platform, Software, SoftwareCategory } from "@/lib/types/software";

const platformValues = ["windows", "mac", "linux", "android", "ios", "web"] as const satisfies readonly Platform[];
const categoryValues = [
  "software",
  "games",
  "operating-systems",
  "multimedia",
  "utilities",
  "development",
  "security",
  "productivity",
  "education",
] as const satisfies readonly SoftwareCategory[];

const ingestSoftwareSchema = softwareSchema.safeExtend({
  id: z.string().uuid().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  previousSlug: z.string().min(1).optional(),
  platforms: z
    .array(z.enum(platformValues))
    .min(1, "Select at least one platform")
    .transform((value) => value as Platform[]),
  categories: z
    .array(z.enum(categoryValues))
    .min(1, "Select at least one category")
    .transform((value) => value as SoftwareCategory[]),
  developer: z.record(z.string(), z.unknown()).optional(),
  features: z.array(z.string()).optional(),
});

const ingestSchema = z.object({
  software: ingestSoftwareSchema,
  publish: z.boolean().optional(),
  deploy: z.boolean().optional(),
  dryRun: z.boolean().optional(),
});

type IngestInput = z.infer<typeof ingestSchema>;

type IngestStep = { step: string; ok: boolean; ms?: number; details?: string };

const handleError = (error: unknown, fallbackMessage: string) => {
  if (error instanceof GitHubConfigError) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json({ message: "Validation failed", errors: error.flatten() }, { status: 400 });
  }

  const message = error instanceof Error ? error.message : fallbackMessage;
  console.error(fallbackMessage, error);
  return NextResponse.json({ message }, { status: 500 });
};

const toSoftwareRecord = (payload: IngestInput["software"]): Software => {
  const now = new Date().toISOString();

  return {
    ...payload,
    id: payload.id ?? randomUUID(),
    createdAt: payload.createdAt ?? now,
    updatedAt: now,
    websiteUrl: payload.websiteUrl ? payload.websiteUrl : null,
    requirements: payload.requirements ?? {},
    changelog: payload.changelog ?? [],
    isTrending: payload.isTrending ?? false,
    developer: payload.developer ?? {},
    features: payload.features ?? [],
  } satisfies Software;
};

const timeStep = async <T,>(step: string, steps: IngestStep[], fn: () => Promise<T>) => {
  const started = Date.now();
  try {
    const result = await fn();
    steps.push({ step, ok: true, ms: Date.now() - started });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    steps.push({ step, ok: false, ms: Date.now() - started, details: message.slice(0, 2000) });
    throw error;
  }
};

export const POST = async (request: NextRequest) => {
  if (!isAdminRequestAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const steps: IngestStep[] = [];

  try {
    const body = (await request.json()) as unknown;
    const parsed = ingestSchema.parse(body);

    const record = toSoftwareRecord(parsed.software);
    const previousSlug = parsed.software.previousSlug?.trim();

    if (parsed.dryRun) {
      return NextResponse.json({ ok: true, dryRun: true, software: record, steps });
    }

    if (previousSlug && previousSlug !== record.slug) {
      try {
        await timeStep("GitHub: delete previous slug", steps, () => deleteSoftwareFromGitHub(previousSlug));
      } catch {
        // best-effort
      }
    }

    await timeStep("GitHub: upsert software", steps, () => saveSoftwareToGitHub(record));

    let publishResult: Awaited<ReturnType<typeof publishLatestSoftwarePagesToGitHub>> | null = null;

    if (parsed.publish) {
      publishResult = await timeStep("GitHub: publish latest chunks", steps, () => publishLatestSoftwarePagesToGitHub());
    }

    if (parsed.deploy) {
      const config = await readLocalAdminConfig();
      const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL ?? config.vercel?.deployHookUrl;
      if (!deployHookUrl) {
        steps.push({ step: "Vercel: deploy hook", ok: false, details: "Missing VERCEL_DEPLOY_HOOK_URL" });
        return NextResponse.json(
          { message: "Missing VERCEL_DEPLOY_HOOK_URL", ok: false, steps, software: record, publish: publishResult },
          { status: 400 },
        );
      }

      await timeStep("Vercel: deploy hook", steps, async () => {
        const resp = await fetch(deployHookUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ source: "soft-hub-admin", action: "ingest" }),
          cache: "no-store",
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          throw new Error(`Deploy hook failed (${resp.status}): ${text.slice(0, 2000)}`);
        }
      });
    }

    return NextResponse.json({ ok: true, steps, software: record, publish: publishResult });
  } catch (error) {
    return handleError(error, "POST /api/admin/ingest failed");
  }
};
