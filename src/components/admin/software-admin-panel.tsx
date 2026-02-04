"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Download, Pencil, Plus, Upload, X } from "lucide-react";

import { formatCompactNumber } from "@/lib/utils/format";
import type { Platform, Software, SoftwareCategory, SoftwareType } from "@/lib/types/software";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SoftwareCard } from "@/components/molecules/software-card";

const platformOptions: Platform[] = ["windows", "mac", "linux", "android", "ios", "web"];
const categoryOptions: SoftwareCategory[] = [
  "software",
  "games",
  "operating-systems",
  "multimedia",
  "utilities",
  "development",
  "security",
  "productivity",
  "education",
];

const primaryCategoryOptions: Array<{ label: string; value: SoftwareCategory }> = [
  { label: "Software", value: "software" },
  { label: "Game", value: "games" },
  { label: "Tool", value: "utilities" },
];
const STANDARD_TYPE: SoftwareType = "standard";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const normalizeImageUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    if (url.pathname === "/_next/image") {
      const original = url.searchParams.get("url");
      if (original) return original;
    }
  } catch {
    // ignore
  }

  if (trimmed.startsWith("/_next/image")) {
    try {
      const url = new URL(trimmed, "https://example.com");
      const original = url.searchParams.get("url");
      if (original) return original;
    } catch {
      // ignore
    }
  }

  const upgraded = trimmed.startsWith("http://") ? `https://${trimmed.slice("http://".length)}` : trimmed;

  try {
    const url = new URL(upgraded);
    const lowerPath = url.pathname.toLowerCase();
    const lowerHref = url.toString().toLowerCase();
    if (lowerPath.includes("spacer") || lowerHref.includes("placeholder") || lowerPath.endsWith("/spacer.gif")) {
      return "";
    }
  } catch {
    // ignore
  }

  return upgraded;
};

const DEFAULT_FORM: FormState = {
  id: undefined,
  name: "",
  slug: "",
  summary: "",
  description: "",
  version: "1.0.0",
  sizeInMb: "250",
  downloadUrl: "",
  websiteUrl: "",
  releaseDate: new Date().toISOString().slice(0, 10),
  platforms: ["windows"],
  categories: ["software"],
  type: STANDARD_TYPE,
  isFeatured: false,
  logoUrl: "",
  heroImage: "",
  gallery: "",
  features: "",
  developerJson: "",
  statsDownloads: "0",
  statsViews: "0",
  statsRating: "0",
  statsVotes: "0",
  minRequirements: "",
  recRequirements: "",
  changelogJson: "",
  createdAt: undefined,
  updatedAt: undefined,
};

type AdminDatasetResponse = {
  items: Software[];
};

type FormState = {
  id?: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  version: string;
  sizeInMb: string;
  downloadUrl: string;
  websiteUrl: string;
  releaseDate: string;
  platforms: Platform[];
  categories: SoftwareCategory[];
  type: SoftwareType;
  isFeatured: boolean;
  logoUrl: string;
  heroImage: string;
  gallery: string;
  features: string;
  developerJson: string;
  statsDownloads: string;
  statsViews: string;
  statsRating: string;
  statsVotes: string;
  minRequirements: string;
  recRequirements: string;
  changelogJson: string;
  createdAt?: string;
  updatedAt?: string;
};

type AdminNotification = {
  id: number;
  type: "success" | "error";
  message: string;
};

type ScrapeResponse = {
  name: string;
  summary: string;
  description: string;
  websiteUrl: string;
  version?: string;
  releaseDate?: string;
  downloads?: number;
  sizeInMb?: number;
  developer?: string;
  requirements?: {
    minimum: string[];
    recommended: string[];
  };
  features?: string[];
  logoUrl: string;
  heroImage: string;
  screenshots: string[];
};

type BulkEditState = {
  isFeatured?: boolean;
  categories: SoftwareCategory[];
  platforms: Platform[];
};

const toFormState = (software: Software): FormState => {
  const sizeInMb = software.sizeInBytes ? (software.sizeInBytes / (1024 * 1024)).toString() : "0";
  const gallery = software.media.gallery.join("\n");
  const minRequirements = software.requirements.minimum?.join("\n") ?? "";
  const recRequirements = software.requirements.recommended?.join("\n") ?? "";
  const features = software.features?.join("\n") ?? "";
  const developerJson = software.developer && Object.keys(software.developer).length > 0 ? JSON.stringify(software.developer, null, 2) : "";
  const releaseDate = software.releaseDate
    ? software.releaseDate.slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const heroImage = software.media.heroImage ?? "";
  const changelogJson = software.changelog?.length
    ? JSON.stringify(software.changelog, null, 2)
    : "";

  const starsRaw = (software.developer as Record<string, unknown>)["stars"];
  const stars = typeof starsRaw === "number" && Number.isFinite(starsRaw) ? starsRaw : undefined;
  const derived = computePopularityStats({ downloads: software.stats.downloads, stars });

  return {
    id: software.id,
    name: software.name,
    slug: software.slug,
    summary: software.summary ?? "",
    description: software.description,
    version: software.version,
    sizeInMb,
    downloadUrl: software.downloadUrl,
    websiteUrl: software.websiteUrl ?? "",
    releaseDate,
    platforms: software.platforms,
    categories: software.categories,
    type: software.type ?? STANDARD_TYPE,
    isFeatured: software.isFeatured,
    logoUrl: software.media.logoUrl,
    heroImage,
    gallery,
    features,
    developerJson,
    statsDownloads: software.stats.downloads.toString(),
    statsViews: (software.stats.views > 0 ? software.stats.views : derived.views).toString(),
    statsRating: (software.stats.rating > 0 ? software.stats.rating : derived.rating).toString(),
    statsVotes: (software.stats.votes > 0 ? software.stats.votes : derived.votes).toString(),
    minRequirements,
    recRequirements,
    changelogJson,
    createdAt: software.createdAt,
    updatedAt: software.updatedAt,
  };
};

const parseNumber = (value: string, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseChangelog = (raw: string) => {
  if (!raw.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error("Changelog must be an array");
    }
    return parsed;
  } catch (error) {
    throw new Error(
      error instanceof Error ? `Failed to parse changelog: ${error.message}` : "Invalid changelog format",
    );
  }
};

const parseDeveloperJson = (raw: string) => {
  if (!raw.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Developer must be a JSON object");
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      error instanceof Error ? `Failed to parse Developer JSON: ${error.message}` : "Invalid Developer JSON format",
    );
  }
};

const splitLines = (raw: string) =>
  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const sanitizeFeaturesText = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((v) => String(v)).map((v) => v.trim()).filter(Boolean).join("\n");
    }
    if (parsed && typeof parsed === "object") {
      return Object.values(parsed as Record<string, unknown>)
        .map((v) => String(v))
        .map((v) => v.trim())
        .filter(Boolean)
        .join("\n");
    }
  } catch {
    // ignore
  }

  return splitLines(trimmed)
    .map((line) => line.replace(/^features\s*:?\s*/i, "").trim())
    .filter(Boolean)
    .join("\n");
};

const isSoftwareCategory = (value: string): value is SoftwareCategory =>
  [
    "software",
    "games",
    "operating-systems",
    "multimedia",
    "utilities",
    "development",
    "security",
    "productivity",
    "education",
  ].includes(value);

const isPlatform = (value: string): value is Platform =>
  ["windows", "mac", "linux", "android", "ios", "web"].includes(value);

const parseCsvLine = (line: string) => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }
    current += ch;
  }

  result.push(current);
  return result.map((v) => v.trim());
};

const computePopularityStats = (params: { downloads: number; stars?: number }) => {
  const downloads = Number.isFinite(params.downloads) ? Math.max(params.downloads, 0) : 0;
  const stars = typeof params.stars === "number" && Number.isFinite(params.stars) ? Math.max(params.stars, 0) : 0;

  const popularity = Math.log10(downloads + 1) + Math.log10(stars + 1) * 1.25;
  const views = Math.round(downloads * (3 + Math.min(Math.log10(stars + 1), 3)));
  const rating = Math.min(5, Math.max(3, 3 + popularity / 3.5));
  const votes = Math.round(Math.min(5000, Math.max(0, stars * 0.08)));

  return {
    views: Math.max(views, 0),
    rating: Number.isFinite(rating) ? Math.round(rating * 10) / 10 : 0,
    votes: Math.max(votes, 0),
  };
};

const toCsvCell = (value: string) => {
  const normalized = value.replace(/\r?\n/g, " ").trim();
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
};

const buildSoftwarePayload = (form: FormState) => {
  const now = new Date().toISOString();
  const sizeMb = parseNumber(form.sizeInMb, 0);
  const sizeInBytes = Math.max(Math.round(sizeMb * 1024 * 1024), 0);

  const normalizedLogoUrl = normalizeImageUrl(form.logoUrl);
  const normalizedHeroImage = normalizeImageUrl(form.heroImage);
  const normalizedGallery = form.gallery
    .split(/\r?\n/)
    .map((line) => normalizeImageUrl(line))
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);

  const downloads = parseNumber(form.statsDownloads, 0);
  const views = parseNumber(form.statsViews, 0);
  const rating = parseNumber(form.statsRating, 0);
  const votes = parseNumber(form.statsVotes, 0);

  const developer = parseDeveloperJson(form.developerJson);
  const starsRaw = (developer as Record<string, unknown>)["stars"];
  const stars = typeof starsRaw === "number" && Number.isFinite(starsRaw) ? starsRaw : undefined;
  const derived = computePopularityStats({ downloads, stars });

  return {
    id: form.id,
    name: form.name.trim(),
    slug: form.slug.trim(),
    summary: form.summary.trim(),
    description: form.description.trim(),
    version: form.version.trim() || "1.0.0",
    sizeInBytes,
    downloadUrl: form.downloadUrl.trim(),
    websiteUrl: form.websiteUrl.trim() || undefined,
    releaseDate: form.releaseDate ? new Date(form.releaseDate).toISOString() : now,
    platforms: form.platforms,
    categories: form.categories,
    type: STANDARD_TYPE,
    isFeatured: form.isFeatured,
    developer,
    features: splitLines(form.features),
    stats: {
      downloads,
      views: views > 0 ? views : derived.views,
      rating: rating > 0 ? rating : derived.rating,
      votes: votes > 0 ? votes : derived.votes,
    },
    media: {
      logoUrl: normalizedLogoUrl,
      heroImage: normalizedHeroImage || undefined,
      gallery: normalizedGallery,
    },
    requirements: {
      minimum: form.minRequirements
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
      recommended: form.recRequirements
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    },
    changelog: parseChangelog(form.changelogJson),
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
  };
};

type RequestError = Error & { status?: number };

const request = async <T,>(input: RequestInfo, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(typeof input === "string" ? input : input.toString(), {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    const errorBody = (() => {
      if (!errorText) {
        return {} as unknown;
      }

      try {
        return JSON.parse(errorText) as unknown;
      } catch {
        return {} as unknown;
      }
    })();

    const errorObject = (errorBody ?? {}) as {
      message?: unknown;
      errors?: { fieldErrors?: Record<string, unknown> };
      debug?: { stack?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    };

    const baseMessage =
      typeof errorObject?.message === "string" ? errorObject.message : `Request failed (${response.status})`;
    const fieldErrors = errorObject?.errors?.fieldErrors as Record<string, string[] | undefined> | undefined;
    const fieldSummary = fieldErrors
      ? Object.entries(fieldErrors)
          .filter(([, errors]) => Array.isArray(errors) && errors.length)
          .map(([field, errors]) => `${field}: ${(errors ?? []).join(" | ")}`)
          .join("\n")
      : "";

    const rawBodyFallback = !fieldSummary && errorText && !errorText.trim().startsWith("{") ? errorText.trim() : "";
    const debugParts: string[] = [];
    const debug = errorObject?.debug;
    if (debug && typeof debug === "object") {
      if (typeof debug.code === "string" && debug.code) debugParts.push(`code=${debug.code}`);
      if (typeof debug.details === "string" && debug.details) debugParts.push(`details=${debug.details}`);
      if (typeof debug.hint === "string" && debug.hint) debugParts.push(`hint=${debug.hint}`);
      if (typeof debug.stack === "string" && debug.stack) debugParts.push(debug.stack);
    }

    const message = [baseMessage, fieldSummary, debugParts.join("\n"), rawBodyFallback].filter(Boolean).join("\n");
    const error = new Error(message) as RequestError;
    error.status = response.status;
    throw error;
  }

  return response.json() as Promise<T>;
};

const drawOrbitWatermark = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.rotate((-18 * Math.PI) / 180);

  const rx = size * 0.46;
  const ry = size * 0.22;

  ctx.globalAlpha = 0.72;
  ctx.lineWidth = Math.max(2, size * 0.045);
  const grad = ctx.createLinearGradient(-rx, 0, rx, 0);
  grad.addColorStop(0, "rgba(34, 211, 238, 0)");
  grad.addColorStop(0.2, "rgba(34, 211, 238, 0.75)");
  grad.addColorStop(0.55, "rgba(99, 102, 241, 0.78)");
  grad.addColorStop(0.8, "rgba(236, 72, 153, 0.62)");
  grad.addColorStop(1, "rgba(236, 72, 153, 0)");
  ctx.strokeStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.shadowColor = "rgba(99, 102, 241, 0.35)";
  ctx.shadowBlur = Math.max(6, size * 0.08);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(rx, 0, Math.max(2, size * 0.04), 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = "rgba(34, 211, 238, 1)";
  ctx.beginPath();
  ctx.arc(rx, 0, Math.max(4, size * 0.085), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

const applyOrbitWatermarkToBlob = async (blob: Blob, mime: string) => {
  if (typeof createImageBitmap !== "function") {
    return blob;
  }

  const image = await createImageBitmap(blob);

  const width = image.width;
  const height = image.height;
  if (!width || !height) {
    return blob;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return blob;

  const source = image as unknown as CanvasImageSource;
  ctx.drawImage(source, 0, 0, width, height);

  // Place watermark bottom-right.
  const watermarkSize = Math.max(110, Math.round(Math.min(width, height) * 0.22));
  const margin = Math.max(20, Math.round(watermarkSize * 0.18));
  drawOrbitWatermark(ctx, width - watermarkSize - margin, height - watermarkSize - margin, watermarkSize);

  const outMime = mime === "image/png" ? "image/png" : "image/webp";
  const quality = outMime === "image/webp" ? 0.92 : undefined;

  const outBlob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, outMime, quality),
  );
  return outBlob ?? blob;
};

const applyOrbitWatermarkToFile = async (file: File) => {
  try {
    const mime = file.type || "image/png";
    const buffer = await file.arrayBuffer();
    const blob = new Blob([buffer], { type: mime });
    const out = await applyOrbitWatermarkToBlob(blob, mime);
    const ext = out.type === "image/png" ? "png" : "webp";
    const baseName = file.name.replace(/\.(png|jpe?g|webp|gif)$/i, "");
    return new File([out], `${baseName}-orbit.${ext}`, { type: out.type });
  } catch {
    return file;
  }
};

export const SoftwareAdminPanel = () => {
  const router = useRouter();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const logoUploadRef = useRef<HTMLInputElement | null>(null);
  const heroUploadRef = useRef<HTMLInputElement | null>(null);
  const screenshotUploadRef = useRef<HTMLInputElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dataset, setDataset] = useState<Software[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(() => DEFAULT_FORM);
  const [showAdvancedCategories, setShowAdvancedCategories] = useState(false);
  const [previousSlug, setPreviousSlug] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkEdit, setBulkEdit] = useState<BulkEditState>({ categories: [], platforms: [] });
  const [bulkSaving, setBulkSaving] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<Array<Partial<FormState>>>([]);
  const [importSaving, setImportSaving] = useState(false);
  const [isSlugChecking, setIsSlugChecking] = useState(false);
  const [uploadingType, setUploadingType] = useState<"logo" | "hero" | "screenshot" | null>(null);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [hasEditedSlug, setHasEditedSlug] = useState(false);
  const [officialUrl, setOfficialUrl] = useState("");
  const [isScraping, setIsScraping] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        const data = await request<AdminDatasetResponse>("/api/admin/software", { signal: controller.signal });
        setDataset(data.items);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        const message = err instanceof Error ? err.message : "Failed to load data";
        setError(message);
        setDataset([]);
        if ((err as RequestError).status === 401) {
          router.refresh();
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      controller.abort();
    };
  }, [router]);

  const pushNotification = (type: AdminNotification["type"], message: string) => {
    setNotifications((prev) => [...prev, { id: Date.now(), type, message }]);
    setTimeout(() => {
      setNotifications((prev) => prev.slice(1));
    }, 5000);
  };

  const openCreateForm = () => {
    setFormState({ ...DEFAULT_FORM, releaseDate: new Date().toISOString().slice(0, 10) });
    setIsFormOpen(true);
    setHasEditedSlug(false);
    setPreviousSlug(null);
  };

  const openEditForm = (software: Software) => {
    setFormState(toFormState(software));
    setIsFormOpen(true);
    setHasEditedSlug(true);
    setPreviousSlug(software.slug);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setFormState(DEFAULT_FORM);
    setHasEditedSlug(false);
    setPreviousSlug(null);
  };

  const slugExists = async (slug: string) => {
    const response = await fetch(`/api/admin/check-slug?slug=${encodeURIComponent(slug)}`);
    if (!response.ok) {
      throw new Error("Failed to check slug");
    }

    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || !("exists" in data)) {
      throw new Error("Unexpected response from slug check service");
    }

    return Boolean((data as { exists?: unknown }).exists);
  };

  const generateUniqueSlug = async (base: string) => {
    const sanitized = slugify(base);
    if (!sanitized) return "";

    let attempt = sanitized;
    let counter = 1;

    while (await slugExists(attempt)) {
      attempt = `${sanitized}-${counter}`;
      counter += 1;
      if (counter > 50) {
        break;
      }
    }

    return attempt;
  };

  const ensureUniqueSlug = async (sourceName: string) => {
    if (hasEditedSlug) return;
    const candidate = slugify(sourceName);
    if (!candidate) return;

    try {
      setIsSlugChecking(true);
      const unique = await generateUniqueSlug(candidate);
      if (!unique) return;

      setFormState((state) => {
        if (hasEditedSlug) {
          return state;
        }
        if (state.slug && state.slug !== candidate) {
          return state;
        }
        return { ...state, slug: unique };
      });
    } catch (err) {
      pushNotification("error", err instanceof Error ? err.message : "Failed to generate a unique slug");
    } finally {
      setIsSlugChecking(false);
    }
  };

  const uploadImage = async (file: File, type: "logo" | "hero" | "screenshot") => {
    const processed = await applyOrbitWatermarkToFile(file);

    const form = new FormData();
    form.append("file", processed);
    form.append("type", type);

    const response = await fetch("/api/admin/upload", {
      method: "POST",
      body: form,
    });

    const payload: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && "message" in payload
          ? String((payload as { message?: unknown }).message)
          : "Image upload failed";
      const error = new Error(message) as RequestError;
      error.status = response.status;
      throw error;
    }

    if (!payload || typeof payload !== "object" || !("url" in payload)) {
      throw new Error("Unexpected upload response");
    }

    return String((payload as { url: unknown }).url);
  };

  const uploadFromUrlWithWatermark = async (
    url: string,
    type: "logo" | "hero" | "screenshot",
  ): Promise<{ url: string; uploaded: boolean }> => {
    const normalized = normalizeImageUrl(url);
    if (!normalized) return { url: "", uploaded: false };

    const response = await fetch(`/api/admin/fetch-image?url=${encodeURIComponent(normalized)}`);
    if (!response.ok) {
      return { url: normalized, uploaded: false };
    }

    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) {
      return { url: normalized, uploaded: false };
    }

    const processed = await applyOrbitWatermarkToBlob(blob, blob.type);
    const ext = processed.type === "image/png" ? "png" : "webp";
    const file = new File([processed], `scrape-${type}-orbit.${ext}`, { type: processed.type });
    const uploadedUrl = await uploadImage(file, type);
    return { url: uploadedUrl, uploaded: true };
  };

  const previewSoftware = useMemo<Software>(() => {
    const now = new Date().toISOString();
    const gallery = splitLines(formState.gallery).slice(0, 3);
    const sizeMb = parseNumber(formState.sizeInMb, 0);
    const sizeInBytes = Math.max(Math.round(sizeMb * 1024 * 1024), 0);

    return {
      id: formState.id ?? "preview",
      slug: formState.slug || "preview",
      name: formState.name || "—",
      summary: formState.summary || null,
      description: formState.description || "",
      version: formState.version || "1.0.0",
      sizeInBytes,
      platforms: formState.platforms.length ? formState.platforms : ["windows"],
      categories: formState.categories.length ? formState.categories : ["software"],
      type: STANDARD_TYPE,
      websiteUrl: formState.websiteUrl || null,
      downloadUrl: formState.downloadUrl || "https://example.com",
      isFeatured: formState.isFeatured,
      isTrending: false,
      releaseDate: formState.releaseDate ? new Date(formState.releaseDate).toISOString() : now,
      createdAt: formState.createdAt ?? now,
      updatedAt: formState.updatedAt ?? now,
      stats: {
        downloads: parseNumber(formState.statsDownloads, 0),
        views: parseNumber(formState.statsViews, 0),
        rating: parseNumber(formState.statsRating, 0),
        votes: parseNumber(formState.statsVotes, 0),
      },
      developer: parseDeveloperJson(formState.developerJson),
      features: splitLines(formState.features),
      media: {
        logoUrl: formState.logoUrl || "",
        heroImage: formState.heroImage || undefined,
        gallery,
      },
      requirements: {
        minimum: splitLines(formState.minRequirements),
        recommended: splitLines(formState.recRequirements),
      },
      changelog: [],
    };
  }, [formState]);

  const toggleSelected = (slug: string) => {
    setSelectedSlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  };

  const clearSelection = () => {
    setSelectedSlugs([]);
  };

  const exportCsv = () => {
    const header = [
      "slug",
      "name",
      "summary",
      "description",
      "version",
      "sizeInMb",
      "downloadUrl",
      "websiteUrl",
      "releaseDate",
      "platforms",
      "categories",
      "isFeatured",
      "logoUrl",
      "heroImage",
      "gallery",
      "features",
      "minRequirements",
      "recRequirements",
      "developerJson",
    ];

    const rows = (selectedSlugs.length ? dataset.filter((item) => selectedSlugs.includes(item.slug)) : dataset).map(
      (item) => {
        const sizeInMb = item.sizeInBytes ? (item.sizeInBytes / (1024 * 1024)).toFixed(1) : "0";
        return [
          item.slug,
          item.name,
          item.summary ?? "",
          item.description,
          item.version,
          sizeInMb,
          item.downloadUrl,
          item.websiteUrl ?? "",
          item.releaseDate ?? "",
          item.platforms.join("|"),
          item.categories.join("|"),
          item.isFeatured ? "true" : "false",
          item.media.logoUrl,
          item.media.heroImage ?? "",
          item.media.gallery.join("|"),
          item.features.join("|"),
          (item.requirements.minimum ?? []).join("|"),
          (item.requirements.recommended ?? []).join("|"),
          item.developer && Object.keys(item.developer).length ? JSON.stringify(item.developer) : "",
        ].map((cell) => toCsvCell(cell));
      },
    );

    const csv = [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedSlugs.length ? "software-selected.csv" : "software.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const openImportDialog = () => {
    setImportRows([]);
    setIsImportOpen(true);
    setTimeout(() => importInputRef.current?.click(), 0);
  };

  const closeImportDialog = () => {
    setIsImportOpen(false);
    setImportRows([]);
  };

  const handleImportFile = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (!lines.length) {
      pushNotification("error", "CSV file is empty");
      return;
    }

    const header = parseCsvLine(lines[0]).map((h) => h.trim());
    const rows = lines.slice(1).map((line) => parseCsvLine(line));

    const idx = (key: string) => header.indexOf(key);

    const nextRows: Array<Partial<FormState>> = rows
      .map((cells) => {
        const get = (key: string) => {
          const i = idx(key);
          return i >= 0 ? (cells[i] ?? "") : "";
        };

        const platforms = get("platforms")
          .split("|")
          .map((v) => v.trim())
          .filter(isPlatform);
        const categories = get("categories")
          .split("|")
          .map((v) => v.trim())
          .filter(isSoftwareCategory);

        return {
          name: get("name"),
          slug: get("slug"),
          summary: get("summary"),
          description: get("description"),
          version: get("version"),
          sizeInMb: get("sizeInMb"),
          downloadUrl: get("downloadUrl"),
          websiteUrl: get("websiteUrl"),
          releaseDate: get("releaseDate"),
          platforms,
          categories,
          isFeatured: get("isFeatured").toLowerCase() === "true",
          logoUrl: get("logoUrl"),
          heroImage: get("heroImage"),
          gallery: get("gallery").split("|").filter(Boolean).join("\n"),
          features: get("features").split("|").filter(Boolean).join("\n"),
          minRequirements: get("minRequirements").split("|").filter(Boolean).join("\n"),
          recRequirements: get("recRequirements").split("|").filter(Boolean).join("\n"),
          developerJson: get("developerJson"),
        };
      })
      .filter((row) => Boolean(row.name) && Boolean(row.slug));

    setImportRows(nextRows.slice(0, 50));
  };

  const confirmImport = async () => {
    if (!importRows.length) {
      pushNotification("error", "No valid rows to import");
      return;
    }

    try {
      setImportSaving(true);
      for (const row of importRows) {
        const merged: FormState = {
          ...DEFAULT_FORM,
          ...row,
          platforms: row.platforms ?? [],
          categories: row.categories ?? [],
          isFeatured: row.isFeatured ?? false,
          releaseDate: row.releaseDate || new Date().toISOString().slice(0, 10),
        };

        const payload = buildSoftwarePayload(merged);
        await request("/api/admin/software", {
          method: "POST",
          body: JSON.stringify({ ...payload, previousSlug: undefined }),
        });
      }

      pushNotification("success", "Import completed");
      closeImportDialog();
      await syncDataset();
    } catch (err) {
      pushNotification("error", err instanceof Error ? err.message : "Import failed");
      if ((err as RequestError).status === 401) {
        router.refresh();
      }
    } finally {
      setImportSaving(false);
    }
  };

  const openBulkEdit = () => {
    setBulkEdit({ categories: [], platforms: [] });
    setIsBulkEditing(true);
  };

  const closeBulkEdit = () => {
    setIsBulkEditing(false);
    setBulkEdit({ categories: [], platforms: [] });
  };

  const applyBulkEdit = async () => {
    if (!selectedSlugs.length) {
      pushNotification("error", "Select items first");
      return;
    }

    try {
      setBulkSaving(true);
      const items = dataset.filter((item) => selectedSlugs.includes(item.slug));

      for (const item of items) {
        const merged: FormState = {
          ...toFormState(item),
          isFeatured: bulkEdit.isFeatured ?? item.isFeatured,
          categories: bulkEdit.categories.length ? bulkEdit.categories : item.categories,
          platforms: bulkEdit.platforms.length ? bulkEdit.platforms : item.platforms,
        };

        const payload = buildSoftwarePayload(merged);
        await request("/api/admin/software", {
          method: "POST",
          body: JSON.stringify({ ...payload, previousSlug: item.slug }),
        });
      }

      pushNotification("success", "Bulk edit applied");
      closeBulkEdit();
      clearSelection();
      await syncDataset();
    } catch (err) {
      pushNotification("error", err instanceof Error ? err.message : "Bulk edit failed");
      if ((err as RequestError).status === 401) {
        router.refresh();
      }
    } finally {
      setBulkSaving(false);
    }
  };

  const syncDataset = async () => {
    try {
      setLoading(true);
      const data = await request<AdminDatasetResponse>("/api/admin/software");
      setDataset(data.items);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to refresh list";
      pushNotification("error", message);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSaving(true);
      const payload = buildSoftwarePayload(formState);
      await request("/api/admin/software", {
        method: "POST",
        body: JSON.stringify({ ...payload, previousSlug: previousSlug ?? undefined }),
      });

      pushNotification("success", "Software saved");
      closeForm();
      await syncDataset();
    } catch (err) {
      pushNotification("error", err instanceof Error ? err.message : "Failed to save software");
      if ((err as RequestError).status === 401) {
        router.refresh();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoFill = async () => {
    if (!formState.name.trim()) {
      pushNotification("error", "Enter the software name first");
      return;
    }

    try {
      setIsAutoFilling(true);
      const data = await request<{
        summary: string;
        description: string;
        version: string;
        sizeInMb: string;
        downloads: number;
        websiteUrl: string;
        logoUrl: string;
        heroImage: string;
        screenshots: string[];
        features: string[];
        requirements: { minimum: string[]; recommended: string[] };
        developer: Record<string, unknown>;
        categories: string[];
      }>("/api/admin/auto-fill", {
        method: "POST",
        body: JSON.stringify({ name: formState.name }),
      });

      const normalizedScreenshots = (data.screenshots ?? [])
        .map((value) => normalizeImageUrl(value))
        .filter(Boolean)
        .slice(0, 6);

      const nextHeroImage = normalizeImageUrl(data.heroImage ?? "");
      const nextLogoUrl = normalizeImageUrl(data.logoUrl ?? "") || normalizedScreenshots[0] || nextHeroImage;

      const safeUpload = async (raw: string, type: "logo" | "hero" | "screenshot") => {
        try {
          return await uploadFromUrlWithWatermark(raw, type);
        } catch {
          return { url: normalizeImageUrl(raw) || "", uploaded: false };
        }
      };

      const [uploadedLogo, uploadedHero, uploadedScreens] = await Promise.all([
        nextLogoUrl ? safeUpload(nextLogoUrl, "logo") : Promise.resolve({ url: "", uploaded: false }),
        nextHeroImage ? safeUpload(nextHeroImage, "hero") : Promise.resolve({ url: "", uploaded: false }),
        Promise.all(normalizedScreenshots.slice(0, 3).map((shot) => safeUpload(shot, "screenshot"))),
      ]);

      const failedUploads = [uploadedLogo, uploadedHero, ...(uploadedScreens ?? [])].filter((item) =>
        item.url && !item.uploaded,
      );
      if (failedUploads.length) {
        pushNotification(
          "error",
          "Some images could not be uploaded to Supabase — external URLs were kept. Check Admin session/env and retry.",
        );
      }

      setFormState((state) => {
        const isDefaultCategories =
          state.categories.length === DEFAULT_FORM.categories.length &&
          state.categories.every((value, index) => value === DEFAULT_FORM.categories[index]);

        const nextCategories = !isDefaultCategories
          ? state.categories
          : (data.categories ?? []).filter(isSoftwareCategory);

        const nextDownloadsValue =
          parseNumber(state.statsDownloads, 0) > 0
            ? state.statsDownloads
            : typeof data.downloads === "number" && Number.isFinite(data.downloads) && data.downloads > 0
              ? String(Math.floor(data.downloads))
              : state.statsDownloads;

        const nextDeveloperJson = state.developerJson.trim()
          ? state.developerJson
          : data.developer && Object.keys(data.developer).length > 0
            ? JSON.stringify(data.developer, null, 2)
            : state.developerJson;

        const parsedDownloads = parseNumber(nextDownloadsValue, 0);
        const parsedDeveloper = parseDeveloperJson(nextDeveloperJson);
        const starsRaw = (parsedDeveloper as Record<string, unknown>)["stars"];
        const stars = typeof starsRaw === "number" && Number.isFinite(starsRaw) ? starsRaw : undefined;
        const derived = computePopularityStats({ downloads: parsedDownloads, stars });

        const cleanedScreens = (uploadedScreens ?? []).map((s) => s.url).filter(Boolean);
        const fallbackGallery = cleanedScreens.length
          ? cleanedScreens.join("\n")
          : normalizedScreenshots.slice(0, 3).join("\n");
        const nextGallery = state.gallery.trim() ? state.gallery : fallbackGallery;

        const resolvedHero = state.heroImage.trim()
          ? state.heroImage
          : (uploadedHero.url || nextHeroImage || state.heroImage);

        const resolvedLogo = state.logoUrl.trim()
          ? state.logoUrl
          : (uploadedLogo.url || nextLogoUrl || state.logoUrl);

        const candidateVersion = (data.version ?? "").trim();
        const shouldApplyVersion = Boolean(candidateVersion) && /\d/.test(candidateVersion);

        const candidateSize = parseNumber(data.sizeInMb ?? "", 0);
        const shouldApplySize = Number.isFinite(candidateSize) && candidateSize > 0;

        return {
          ...state,
          summary: state.summary.trim() ? state.summary : data.summary ?? state.summary,
          description: state.description.trim() ? state.description : data.description ?? state.description,
          version:
            state.version.trim() && state.version !== "1.0.0"
              ? state.version
              : shouldApplyVersion
                ? candidateVersion
                : state.version,
          sizeInMb:
            parseNumber(state.sizeInMb, 0) > 0 && state.sizeInMb !== "250"
              ? state.sizeInMb
              : shouldApplySize
                ? String(Math.round(candidateSize * 10) / 10)
                : state.sizeInMb,
          statsDownloads: nextDownloadsValue,
          statsViews: parseNumber(state.statsViews, 0) > 0 ? state.statsViews : String(derived.views),
          statsRating: parseNumber(state.statsRating, 0) > 0 ? state.statsRating : String(derived.rating),
          statsVotes: parseNumber(state.statsVotes, 0) > 0 ? state.statsVotes : String(derived.votes),
          websiteUrl: state.websiteUrl.trim() ? state.websiteUrl : data.websiteUrl ?? state.websiteUrl,
          logoUrl: resolvedLogo,
          heroImage: resolvedHero,
          gallery: nextGallery,
          minRequirements: state.minRequirements.trim()
            ? state.minRequirements
            : data.requirements?.minimum?.join("\n") ?? state.minRequirements,
          recRequirements: state.recRequirements.trim()
            ? state.recRequirements
            : data.requirements?.recommended?.join("\n") ?? state.recRequirements,
          features: state.features.trim()
            ? state.features
            : sanitizeFeaturesText((data.features ?? []).join("\n")) || state.features,
          developerJson: nextDeveloperJson,
          categories: nextCategories.length ? nextCategories : state.categories,
        };
      });

      await ensureUniqueSlug(formState.name);

      pushNotification("success", "Auto-fill completed — review before saving");
    } catch (err) {
      pushNotification("error", err instanceof Error ? err.message : "Auto-fill failed");
      if ((err as RequestError).status === 401) {
        router.refresh();
      }
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleScrapeOfficial = async () => {
    const url = officialUrl.trim();
    if (!url) {
      pushNotification("error", "Enter the official website URL first");
      return;
    }

    try {
      setIsScraping(true);
      const data = await request<ScrapeResponse>("/api/admin/scrape", {
        method: "POST",
        body: JSON.stringify({ url }),
      });

      const normalizedScreenshots = (data.screenshots ?? [])
        .map((value) => normalizeImageUrl(value))
        .filter(Boolean)
        .slice(0, 6);

      const nextHeroImage = normalizeImageUrl(data.heroImage ?? "");
      const nextLogoUrl = normalizeImageUrl(data.logoUrl ?? "") || normalizedScreenshots[0] || nextHeroImage;

      const safeUpload = async (raw: string, type: "logo" | "hero" | "screenshot") => {
        try {
          const result = await uploadFromUrlWithWatermark(raw, type);
          return result;
        } catch {
          return { url: normalizeImageUrl(raw) || "", uploaded: false };
        }
      };

      // Upload & watermark scraped assets so we store our own branded media.
      const [uploadedLogo, uploadedHero, uploadedScreens] = await Promise.all([
        nextLogoUrl ? safeUpload(nextLogoUrl, "logo") : Promise.resolve({ url: "", uploaded: false }),
        nextHeroImage ? safeUpload(nextHeroImage, "hero") : Promise.resolve({ url: "", uploaded: false }),
        Promise.all(normalizedScreenshots.slice(0, 3).map((shot) => safeUpload(shot, "screenshot"))),
      ]);

      const failedUploads = [uploadedLogo, uploadedHero, ...(uploadedScreens ?? [])].filter((item) =>
        item.url && !item.uploaded,
      );

      if (failedUploads.length) {
        pushNotification(
          "error",
          "Some scraped images could not be uploaded to Supabase — external URLs were kept. Check Admin session/env and retry.",
        );
      }

      setFormState((state) => {
        const cleanedScreens = (uploadedScreens ?? []).map((item) => item.url).filter(Boolean);
        const fallbackGallery = cleanedScreens.length
          ? cleanedScreens.join("\n")
          : normalizedScreenshots.slice(0, 3).join("\n");
        const nextGallery = state.gallery.trim() ? state.gallery : fallbackGallery;

        const resolvedHero = state.heroImage.trim() ? state.heroImage : (uploadedHero.url || nextHeroImage || state.heroImage);
        const resolvedLogo = state.logoUrl.trim() ? state.logoUrl : (uploadedLogo.url || nextLogoUrl || state.logoUrl);

        const nextDownloads =
          parseNumber(state.statsDownloads, 0) > 0
            ? state.statsDownloads
            : typeof data.downloads === "number" && Number.isFinite(data.downloads) && data.downloads > 0
              ? String(Math.floor(data.downloads))
              : state.statsDownloads;

        const nextDeveloperJson = state.developerJson.trim()
          ? state.developerJson
          : data.developer?.trim()
            ? JSON.stringify({ name: data.developer.trim(), source: "scrape" }, null, 2)
            : state.developerJson;

        const nextMinReq = state.minRequirements.trim()
          ? state.minRequirements
          : data.requirements?.minimum?.length
            ? data.requirements.minimum.join("\n")
            : state.minRequirements;

        const nextRecReq = state.recRequirements.trim()
          ? state.recRequirements
          : data.requirements?.recommended?.length
            ? data.requirements.recommended.join("\n")
            : state.recRequirements;

        const today = new Date().toISOString().slice(0, 10);
        const normalizeDate = (raw: string) => {
          const trimmed = raw.trim();
          if (!trimmed) return "";
          if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
          const parsed = new Date(trimmed);
          return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
        };
        const scrapedDate = data.releaseDate ? normalizeDate(data.releaseDate) : "";

        const changelogJson = (() => {
          if (state.changelogJson.trim()) return state.changelogJson;
          const version = (state.version.trim() && state.version !== "1.0.0")
            ? state.version
            : (data.version?.trim() || state.version);
          const dateIso = new Date((scrapedDate || state.releaseDate || today).trim() || today).toISOString();
          const entry = {
            version: version || "1.0.0",
            date: dateIso,
            highlights: ["Imported from official website", "Media assets watermarked automatically"],
          };
          return JSON.stringify([entry], null, 2);
        })();

        const nextSizeInMb =
          parseNumber(state.sizeInMb, 0) > 0 && state.sizeInMb !== "250"
            ? state.sizeInMb
            : typeof data.sizeInMb === "number" && Number.isFinite(data.sizeInMb) && data.sizeInMb > 0
              ? String(Math.round(data.sizeInMb * 10) / 10)
              : state.sizeInMb;

        const nextPlatforms: Platform[] = state.platforms.length ? state.platforms : (["windows"] as Platform[]);
        const nextCategories: SoftwareCategory[] = state.categories.length
          ? state.categories
          : (["software"] as SoftwareCategory[]);

        const nextFeatures = state.features.trim()
          ? state.features
          : data.features?.length
            ? sanitizeFeaturesText(data.features.join("\n"))
            : state.features;

        return {
          ...state,
          name: state.name.trim() ? state.name : (data.name ?? state.name),
          summary: state.summary.trim() ? state.summary : (data.summary ?? state.summary),
          description: state.description.trim() ? state.description : (data.description ?? state.description),
          version:
            state.version.trim() && state.version !== "1.0.0" ? state.version : (data.version?.trim() || state.version),
          releaseDate:
            state.releaseDate.trim() && state.releaseDate !== today ? state.releaseDate : (scrapedDate || state.releaseDate),
          sizeInMb: nextSizeInMb,
          statsDownloads: nextDownloads,
          developerJson: nextDeveloperJson,
          minRequirements: nextMinReq,
          recRequirements: nextRecReq,
          features: nextFeatures,
          logoUrl: resolvedLogo,
          heroImage: resolvedHero,
          gallery: nextGallery,
          platforms: nextPlatforms,
          categories: nextCategories,
          changelogJson,
        };
      });

      if (!formState.name.trim() && data.name?.trim()) {
        await ensureUniqueSlug(data.name);
      }

      pushNotification("success", "Website data fetched — review before saving");
    } catch (err) {
      pushNotification("error", err instanceof Error ? err.message : "Failed to scrape website data");
      if ((err as RequestError).status === 401) {
        router.refresh();
      }
    } finally {
      setIsScraping(false);
    }
  };

  const handleDelete = async (software: Software) => {
    if (!confirm(`Delete ${software.name}?`)) {
      return;
    }

    try {
      setLoading(true);
      await request(`/api/admin/software?slug=${encodeURIComponent(software.slug)}`, {
        method: "DELETE",
      });
      pushNotification("success", "Software deleted");
      await syncDataset();
    } catch (err) {
      pushNotification("error", err instanceof Error ? err.message : "Failed to delete software");
      if ((err as RequestError).status === 401) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const totalDownloads = useMemo(
    () => dataset.reduce((sum, item) => sum + (item.stats.downloads ?? 0), 0),
    [dataset],
  );

  return (
    <div className="relative space-y-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-primary-500/12 blur-3xl" />
        <div className="absolute -bottom-24 left-1/4 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-purple-500/12 blur-3xl" />
        <div className="absolute -bottom-40 right-10 h-[420px] w-[420px] rounded-full bg-sky-500/8 blur-3xl" />
      </div>
      <header className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-neutral-950/60 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-100">Software admin</h1>
            <p className="text-sm text-neutral-400">
              Manage your catalog, scrape official pages, and publish to GitHub with Orbit-watermarked media.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={openCreateForm} className="bg-gradient-to-r from-primary-500 to-purple-600 text-white hover:from-primary-400 hover:to-purple-500">
              <Plus className="ms-2 h-4 w-4" />
              New software
            </Button>
            <Button variant="outline" onClick={syncDataset} disabled={loading} className="border-white/15 bg-white/[0.02] hover:bg-white/[0.06]">
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-lg border px-4 py-2 text-sm ${
                notification.type === "success"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : "border-red-500/40 bg-red-500/10 text-red-200"
              }`}
            >
              {notification.message}
            </div>
          ))}
        </div>
      )}

      <section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-white/10 bg-neutral-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-neutral-400">Total software</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-neutral-100">{dataset.length}</p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-neutral-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-neutral-400">Total downloads</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-neutral-100">
                {formatCompactNumber(totalDownloads, "en")}
              </p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-neutral-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-neutral-400">Last update</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-neutral-100">
                {loading ? "..." : mounted ? new Date().toLocaleString("en-US") : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-xl font-semibold text-neutral-200">Software list</h2>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={exportCsv} className="border-white/15 bg-white/[0.02] hover:bg-white/[0.06]">
              <Download className="ms-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button type="button" variant="outline" onClick={openImportDialog} className="border-white/15 bg-white/[0.02] hover:bg-white/[0.06]">
              <Upload className="ms-2 h-4 w-4" />
              Import CSV
            </Button>
            {selectedSlugs.length ? (
              <>
                <Button type="button" variant="outline" onClick={openBulkEdit} className="border-white/15 bg-white/[0.02] hover:bg-white/[0.06]">
                  <Pencil className="ms-2 h-4 w-4" />
                  Bulk Edit ({selectedSlugs.length})
                </Button>
                <Button type="button" variant="outline" onClick={clearSelection} className="border-white/15 bg-white/[0.02] hover:bg-white/[0.06]">
                  Clear selection
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          {dataset.map((software) => (
            <Card
              key={software.id}
              className="group border-white/10 bg-neutral-900/70 transition hover:-translate-y-[1px] hover:border-white/20 hover:bg-neutral-900/80 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg text-neutral-50">
                  <span className="flex items-center gap-3">
                    <button
                      type="button"
                      className={
                        selectedSlugs.includes(software.slug)
                          ? "h-4 w-4 rounded border border-primary-400 bg-primary-500"
                          : "h-4 w-4 rounded border border-white/20 bg-white/5"
                      }
                      aria-label="select"
                      onClick={() => toggleSelected(software.slug)}
                    />
                    {software.name}
                  </span>
                  <span className="text-xs font-normal text-neutral-500">{software.slug}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-neutral-300">
                <p className="line-clamp-3 text-neutral-400">{software.summary}</p>
                <div className="flex flex-wrap gap-2 text-xs text-neutral-400">
                  {software.platforms.map((platform) => (
                    <span
                      key={platform}
                      className="rounded-full border border-white/10 px-2 py-1 uppercase text-[10px]"
                    >
                      {platform}
                    </span>
                  ))}
                  <span className="rounded-full border border-white/10 px-2 py-1 uppercase text-[10px]">
                    {software.type}
                  </span>
                  {software.isFeatured ? (
                    <span className="rounded-full border border-amber-400/60 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200">
                      Featured
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-500">
                  <span>Downloads: {software.stats.downloads.toLocaleString("en-US")}</span>
                  <span>Rating: {software.stats.rating.toFixed(1)} ⭐</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => openEditForm(software)} className="bg-white/10 hover:bg-white/15">
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500/60 text-red-200"
                    onClick={() => handleDelete(software)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {dataset.length === 0 && !loading && !error ? (
          <Card className="border-dashed border-white/10 bg-neutral-900/60">
            <CardContent className="p-6 text-center text-sm text-neutral-400">
              No software has been added yet.
            </CardContent>
          </Card>
        ) : null}
      </section>

      {isFormOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-full w-full max-w-6xl overflow-y-auto rounded-2xl border border-white/10 bg-neutral-950/95 p-6 shadow-[0_40px_120px_rgba(0,0,0,0.65)] backdrop-blur">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-neutral-100">
                {formState.id ? "Edit software" : "Create software"}
              </h3>
              <Button variant="ghost" onClick={closeForm} className="text-neutral-400 hover:text-neutral-200">
                Close
              </Button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <form onSubmit={handleFormSubmit} className="space-y-6">
                <Tabs defaultValue="basic">
                  <TabsList className="w-full justify-start border border-white/10 bg-white/[0.03]">
                    <TabsTrigger value="basic">Basic</TabsTrigger>
                    <TabsTrigger value="media">Media</TabsTrigger>
                    <TabsTrigger value="stats">Stats</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced</TabsTrigger>
                  </TabsList>
                  <TabsContent value="basic">
                    <section className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm text-neutral-300">Software name</label>
                        <div className="flex flex-wrap gap-2">
                          <Input
                            required
                            value={formState.name}
                            onChange={(event) => {
                              const value = event.target.value;
                              setFormState((state) => ({
                                ...state,
                                name: value,
                                ...(hasEditedSlug ? {} : { slug: slugify(value) }),
                              }));
                            }}
                            onBlur={() => void ensureUniqueSlug(formState.name)}
                          />
                          <Button
                            type="button"
                            onClick={handleAutoFill}
                            disabled={isAutoFilling || !formState.name.trim()}
                            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800"
                          >
                            {isAutoFilling ? "Filling..." : "Auto-fill"}
                          </Button>
                        </div>
                        <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
                          <Input
                            value={officialUrl}
                            onChange={(event) => setOfficialUrl(event.target.value)}
                            placeholder="Official website URL (https://...)"
                          />
                          <Button
                            type="button"
                            onClick={handleScrapeOfficial}
                            disabled={isScraping || !officialUrl.trim()}
                            variant="outline"
                            className="border-white/15"
                          >
                            {isScraping ? "Fetching..." : "Fetch website"}
                          </Button>
                        </div>
                        {isSlugChecking ? <p className="text-xs text-neutral-500">Checking slug...</p> : null}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-neutral-300">Slug</label>
                        <Input
                          required
                          value={formState.slug}
                          onChange={(event) => {
                            const value = slugify(event.target.value);
                            setFormState((state) => ({ ...state, slug: value }));
                            setHasEditedSlug(true);
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm text-neutral-300">Type</label>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-neutral-400">Primary type</span>
                            {primaryCategoryOptions.map((option) => {
                              const selected = formState.categories[0] === option.value;
                              return (
                                <Button
                                  key={option.value}
                                  type="button"
                                  variant={selected ? "primary" : "outline"}
                                  className={selected ? "bg-primary-500" : undefined}
                                  onClick={() =>
                                    setFormState((state) => ({
                                      ...state,
                                      categories: [option.value],
                                    }))
                                  }
                                >
                                  {option.label}
                                </Button>
                              );
                            })}

                            <Button
                              type="button"
                              variant="ghost"
                              className="ml-auto text-xs text-neutral-300"
                              onClick={() => setShowAdvancedCategories((v) => !v)}
                            >
                              {showAdvancedCategories ? "Hide advanced" : "Advanced"}
                            </Button>
                          </div>

                          {showAdvancedCategories ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {categoryOptions.map((category) => {
                                const selected = formState.categories.includes(category);
                                return (
                                  <Button
                                    key={category}
                                    type="button"
                                    variant={selected ? "primary" : "outline"}
                                    className={selected ? "bg-primary-500" : undefined}
                                    onClick={() =>
                                      setFormState((state) => ({
                                        ...state,
                                        categories: selected
                                          ? state.categories.filter((item) => item !== category)
                                          : [...state.categories, category],
                                      }))
                                    }
                                  >
                                    {category}
                                  </Button>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-neutral-300">Version</label>
                        <Input
                          value={formState.version}
                          onChange={(event) => setFormState((state) => ({ ...state, version: event.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-neutral-300">Size (MB)</label>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={formState.sizeInMb}
                          onChange={(event) => setFormState((state) => ({ ...state, sizeInMb: event.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-neutral-300">Download URL</label>
                        <Input
                          required
                          value={formState.downloadUrl}
                          onChange={(event) =>
                            setFormState((state) => ({ ...state, downloadUrl: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-neutral-300">Official website</label>
                        <Input
                          value={formState.websiteUrl}
                          onChange={(event) =>
                            setFormState((state) => ({ ...state, websiteUrl: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-neutral-300">Release date</label>
                        <Input
                          type="date"
                          value={formState.releaseDate}
                          onChange={(event) =>
                            setFormState((state) => ({ ...state, releaseDate: event.target.value }))
                          }
                        />
                      </div>
                    </section>

                    <section className="mt-6 grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm text-neutral-300">Summary</label>
                        <Textarea
                          required
                          value={formState.summary}
                          onChange={(event) => setFormState((state) => ({ ...state, summary: event.target.value }))}
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm text-neutral-300">Description</label>
                        <Textarea
                          required
                          value={formState.description}
                          onChange={(event) =>
                            setFormState((state) => ({ ...state, description: event.target.value }))
                          }
                          rows={5}
                        />
                      </div>
                    </section>
                  </TabsContent>

                  <TabsContent value="media">
                    <section className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <label className="text-sm font-medium text-neutral-200">Logo</label>
                          {uploadingType === "logo" ? (
                            <span className="rounded-full border border-primary-400/40 bg-primary-500/10 px-2 py-0.5 text-[11px] text-primary-200">
                              Uploading…
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => logoUploadRef.current?.click()}
                            disabled={uploadingType !== null}
                            className="border-white/15 bg-white/[0.02] hover:bg-white/[0.06]"
                          >
                            <Upload className="ms-2 h-4 w-4" />
                            Upload logo
                          </Button>
                          <input
                            ref={logoUploadRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (event) => {
                              const file = event.target.files?.[0];
                              event.target.value = "";
                              if (!file) return;

                              try {
                                setUploadingType("logo");
                                const url = await uploadImage(file, "logo");
                                setFormState((state) => ({ ...state, logoUrl: url }));
                                pushNotification("success", "Logo uploaded");
                              } catch (err) {
                                pushNotification("error", err instanceof Error ? err.message : "Failed to upload logo");
                                if ((err as RequestError).status === 401) {
                                  router.refresh();
                                }
                              } finally {
                                setUploadingType(null);
                              }
                            }}
                          />
                        </div>
                        <Input
                          required
                          value={formState.logoUrl}
                          onChange={(event) =>
                            setFormState((state) => ({ ...state, logoUrl: event.target.value }))
                          }
                          className="bg-white/[0.02]"
                        />
                        {normalizeImageUrl(formState.logoUrl) ? (
                          <div className="relative mt-2 h-28 w-28 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_10px_25px_rgba(0,0,0,0.35)]">
                            <Image
                              src={normalizeImageUrl(formState.logoUrl)}
                              alt="logo"
                              fill
                              className="object-contain"
                              unoptimized
                              sizes="112px"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="absolute right-2 top-2 h-7 w-7 rounded-full bg-black/40 p-0 text-neutral-100 hover:bg-black/60"
                              onClick={() => setFormState((state) => ({ ...state, logoUrl: "" }))}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <label className="text-sm font-medium text-neutral-200">Hero image</label>
                          {uploadingType === "hero" ? (
                            <span className="rounded-full border border-primary-400/40 bg-primary-500/10 px-2 py-0.5 text-[11px] text-primary-200">
                              Uploading…
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => heroUploadRef.current?.click()}
                            disabled={uploadingType !== null}
                            className="border-white/15 bg-white/[0.02] hover:bg-white/[0.06]"
                          >
                            <Upload className="ms-2 h-4 w-4" />
                            Upload hero
                          </Button>
                          <input
                            ref={heroUploadRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (event) => {
                              const file = event.target.files?.[0];
                              event.target.value = "";
                              if (!file) return;

                              try {
                                setUploadingType("hero");
                                const url = await uploadImage(file, "hero");
                                setFormState((state) => ({ ...state, heroImage: url }));
                                pushNotification("success", "Hero image uploaded");
                              } catch (err) {
                                pushNotification("error", err instanceof Error ? err.message : "Failed to upload image");
                                if ((err as RequestError).status === 401) {
                                  router.refresh();
                                }
                              } finally {
                                setUploadingType(null);
                              }
                            }}
                          />
                        </div>
                        <Input
                          value={formState.heroImage}
                          onChange={(event) =>
                            setFormState((state) => ({ ...state, heroImage: event.target.value }))
                          }
                          className="bg-white/[0.02]"
                        />
                        {normalizeImageUrl(formState.heroImage) ? (
                          <div className="relative mt-2 h-28 w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_10px_25px_rgba(0,0,0,0.35)]">
                            <Image
                              src={normalizeImageUrl(formState.heroImage)}
                              alt="hero"
                              fill
                              className="object-cover"
                              unoptimized
                              sizes="420px"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="absolute right-2 top-2 h-7 w-7 rounded-full bg-black/40 p-0 text-neutral-100 hover:bg-black/60"
                              onClick={() => setFormState((state) => ({ ...state, heroImage: "" }))}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:col-span-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-sm font-medium text-neutral-200">Gallery</label>
                          <p className="text-xs text-neutral-500">One URL per line. We’ll preview the first 3.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => screenshotUploadRef.current?.click()}
                            disabled={uploadingType !== null}
                            className="border-white/15 bg-white/[0.02] hover:bg-white/[0.06]"
                          >
                            <Upload className="ms-2 h-4 w-4" />
                            Upload screenshot
                          </Button>
                          <input
                            ref={screenshotUploadRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (event) => {
                              const file = event.target.files?.[0];
                              event.target.value = "";
                              if (!file) return;

                              try {
                                setUploadingType("screenshot");
                                const url = await uploadImage(file, "screenshot");
                                setFormState((state) => ({
                                  ...state,
                                  gallery: state.gallery.trim() ? `${state.gallery.trim()}\n${url}` : url,
                                }));
                                pushNotification("success", "Screenshot uploaded");
                              } catch (err) {
                                pushNotification("error", err instanceof Error ? err.message : "Failed to upload screenshot");
                                if ((err as RequestError).status === 401) {
                                  router.refresh();
                                }
                              } finally {
                                setUploadingType(null);
                              }
                            }}
                          />
                          {uploadingType === "screenshot" ? (
                            <span className="text-xs text-neutral-500">Uploading…</span>
                          ) : null}
                        </div>
                        <Textarea
                          value={formState.gallery}
                          onChange={(event) => setFormState((state) => ({ ...state, gallery: event.target.value }))}
                          rows={3}
                          className="bg-white/[0.02]"
                        />

                        {splitLines(formState.gallery).map((value) => normalizeImageUrl(value)).filter(Boolean).length ? (
                          <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            {splitLines(formState.gallery)
                              .map((value) => normalizeImageUrl(value))
                              .filter(Boolean)
                              .slice(0, 3)
                              .map((url, index) => (
                                <div
                                  key={`${url}-${index}`}
                                  className="relative h-24 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_10px_25px_rgba(0,0,0,0.35)]"
                                >
                                  <Image src={url} alt="gallery" fill className="object-cover" sizes="200px" unoptimized />
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="absolute right-2 top-2 h-7 w-7 rounded-full bg-black/40 p-0 text-neutral-100 hover:bg-black/60"
                                    onClick={() =>
                                      setFormState((state) => ({
                                        ...state,
                                        gallery: splitLines(state.gallery)
                                          .filter((_, i) => i !== index)
                                          .join("\n"),
                                      }))
                                    }
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ))}
                          </div>
                        ) : null}
                      </div>
                    </section>
                  </TabsContent>

                  <TabsContent value="stats">
                    <section className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm text-neutral-300">Downloads</label>
                        <Input
                          type="number"
                          min="0"
                          value={formState.statsDownloads}
                          onChange={(event) =>
                            setFormState((state) => ({ ...state, statsDownloads: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-neutral-300">Views</label>
                        <Input
                          type="number"
                          min="0"
                          value={formState.statsViews}
                          disabled
                          onChange={(event) =>
                            setFormState((state) => ({ ...state, statsViews: event.target.value }))
                          }
                        />
                        <p className="text-xs text-neutral-500">Internal metric (tracked by SOFT-HUB analytics).</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-neutral-300">Rating</label>
                        <Input
                          type="number"
                          min="0"
                          max="5"
                          step="0.1"
                          value={formState.statsRating}
                          disabled
                          onChange={(event) =>
                            setFormState((state) => ({ ...state, statsRating: event.target.value }))
                          }
                        />
                        <p className="text-xs text-neutral-500">Internal metric (calculated from votes).</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-neutral-300">Votes</label>
                        <Input
                          type="number"
                          min="0"
                          value={formState.statsVotes}
                          disabled
                          onChange={(event) =>
                            setFormState((state) => ({ ...state, statsVotes: event.target.value }))
                          }
                        />
                        <p className="text-xs text-neutral-500">Internal metric (tracked by SOFT-HUB).</p>
                      </div>
                    </section>

                    <section className="mt-6 grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm text-neutral-300">Platforms</label>
                        <div className="flex flex-wrap gap-2">
                          {platformOptions.map((platform) => {
                            const selected = formState.platforms.includes(platform);
                            return (
                              <Button
                                key={platform}
                                type="button"
                                variant={selected ? "primary" : "outline"}
                                className={selected ? "bg-primary-500" : undefined}
                                onClick={() =>
                                  setFormState((state) => ({
                                    ...state,
                                    platforms: selected
                                      ? state.platforms.filter((item) => item !== platform)
                                      : [...state.platforms, platform],
                                  }))
                                }
                              >
                                {platform}
                              </Button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm text-neutral-300">Categories</label>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-neutral-400">Primary type</span>
                            {primaryCategoryOptions.map((option) => {
                              const selected = formState.categories[0] === option.value;
                              return (
                                <Button
                                  key={option.value}
                                  type="button"
                                  variant={selected ? "primary" : "outline"}
                                  className={selected ? "bg-primary-500" : undefined}
                                  onClick={() =>
                                    setFormState((state) => ({
                                      ...state,
                                      categories: [option.value],
                                    }))
                                  }
                                >
                                  {option.label}
                                </Button>
                              );
                            })}

                            <Button
                              type="button"
                              variant="ghost"
                              className="ml-auto text-xs text-neutral-300"
                              onClick={() => setShowAdvancedCategories((v) => !v)}
                            >
                              {showAdvancedCategories ? "Hide advanced" : "Advanced"}
                            </Button>
                          </div>
                        </div>

                        {showAdvancedCategories ? (
                          <div className="flex flex-wrap gap-2">
                            {categoryOptions.map((category) => {
                              const selected = formState.categories.includes(category);
                              return (
                                <Button
                                  key={category}
                                  type="button"
                                  variant={selected ? "primary" : "outline"}
                                  className={selected ? "bg-primary-500" : undefined}
                                  onClick={() =>
                                    setFormState((state) => ({
                                      ...state,
                                      categories: selected
                                        ? state.categories.filter((item) => item !== category)
                                        : [...state.categories, category],
                                    }))
                                  }
                                >
                                  {category}
                                </Button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm text-neutral-300">Featured in UI</label>
                        <Button
                          type="button"
                          variant={formState.isFeatured ? "primary" : "outline"}
                          className={formState.isFeatured ? "bg-amber-500 text-neutral-900" : undefined}
                          onClick={() => setFormState((state) => ({ ...state, isFeatured: !state.isFeatured }))}
                        >
                          {formState.isFeatured ? "Featured" : "Not featured"}
                        </Button>
                      </div>
                    </section>
                  </TabsContent>

                  <TabsContent value="advanced">
                    <section className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm text-neutral-300">Features (one per line)</label>
                        <Textarea
                          value={formState.features}
                          onChange={(event) =>
                            setFormState((state) => ({ ...state, features: event.target.value }))
                          }
                          rows={4}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-neutral-300">Developer (JSON)</label>
                        <Textarea
                          value={formState.developerJson}
                          onChange={(event) =>
                            setFormState((state) => ({ ...state, developerJson: event.target.value }))
                          }
                          rows={4}
                          placeholder='{"name":"","source":""}'
                        />
                      </div>
                    </section>

                    <section className="mt-6 grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm text-neutral-300">Minimum requirements (one per line)</label>
                        <Textarea
                          value={formState.minRequirements}
                          onChange={(event) =>
                            setFormState((state) => ({ ...state, minRequirements: event.target.value }))
                          }
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-neutral-300">Recommended requirements (one per line)</label>
                        <Textarea
                          value={formState.recRequirements}
                          onChange={(event) =>
                            setFormState((state) => ({ ...state, recRequirements: event.target.value }))
                          }
                          rows={3}
                        />
                      </div>
                    </section>

                    <section className="mt-6 space-y-2">
                      <label className="text-sm text-neutral-300">Changelog (JSON)</label>
                      <Textarea
                        value={formState.changelogJson}
                        onChange={(event) =>
                          setFormState((state) => ({ ...state, changelogJson: event.target.value }))
                        }
                        rows={6}
                        placeholder='[\n  {"version":"1.0.0","date":"2024-01-01","highlights":["Initial release"]}\n]'
                      />
                    </section>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={closeForm}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="bg-primary-500 text-white hover:bg-primary-400"
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </form>

              <aside className="sticky top-4 space-y-3 rounded-2xl border border-white/10 bg-neutral-900/40 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-neutral-200">Preview</p>
                </div>
                <SoftwareCard software={previewSoftware} showActions={false} />
              </aside>
            </div>
          </div>
        </div>
      )}

      {isBulkEditing ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-neutral-950/95 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-100">Bulk Edit ({selectedSlugs.length})</h3>
              <Button variant="ghost" onClick={closeBulkEdit} className="text-neutral-400 hover:text-neutral-200">
                Close
              </Button>
            </div>

            <div className="mt-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Featured</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={bulkEdit.isFeatured === true ? "primary" : "outline"}
                    className={bulkEdit.isFeatured === true ? "bg-amber-500 text-neutral-900" : undefined}
                    onClick={() => setBulkEdit((s) => ({ ...s, isFeatured: true }))}
                  >
                    Featured
                  </Button>
                  <Button
                    type="button"
                    variant={bulkEdit.isFeatured === false ? "primary" : "outline"}
                    onClick={() => setBulkEdit((s) => ({ ...s, isFeatured: false }))}
                  >
                    Not featured
                  </Button>
                  <Button
                    type="button"
                    variant={bulkEdit.isFeatured === undefined ? "primary" : "outline"}
                    onClick={() => setBulkEdit((s) => ({ ...s, isFeatured: undefined }))}
                  >
                    No change
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Categories</label>
                <div className="flex flex-wrap gap-2">
                  {categoryOptions.map((category) => {
                    const selected = bulkEdit.categories.includes(category);
                    return (
                      <Button
                        key={category}
                        type="button"
                        variant={selected ? "primary" : "outline"}
                        className={selected ? "bg-primary-500" : undefined}
                        onClick={() =>
                          setBulkEdit((state) => ({
                            ...state,
                            categories: selected
                              ? state.categories.filter((item) => item !== category)
                              : [...state.categories, category],
                          }))
                        }
                      >
                        {category}
                      </Button>
                    );
                  })}
                </div>
                <p className="text-xs text-neutral-500">If you don&apos;t select any category, categories won&apos;t change.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {platformOptions.map((platform) => {
                    const selected = bulkEdit.platforms.includes(platform);
                    return (
                      <Button
                        key={platform}
                        type="button"
                        variant={selected ? "primary" : "outline"}
                        className={selected ? "bg-primary-500" : undefined}
                        onClick={() =>
                          setBulkEdit((state) => ({
                            ...state,
                            platforms: selected
                              ? state.platforms.filter((item) => item !== platform)
                              : [...state.platforms, platform],
                          }))
                        }
                      >
                        {platform}
                      </Button>
                    );
                  })}
                </div>
                <p className="text-xs text-neutral-500">If you don&apos;t select any platform, platforms won&apos;t change.</p>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={closeBulkEdit}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={bulkSaving}
                  onClick={() => void applyBulkEdit()}
                  className="bg-primary-500 text-white hover:bg-primary-400"
                >
                  {bulkSaving ? "Applying..." : "Apply"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isImportOpen ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-neutral-950/95 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-100">Import CSV</h3>
              <Button variant="ghost" onClick={closeImportDialog} className="text-neutral-400 hover:text-neutral-200">
                Close
              </Button>
            </div>

            <input
              ref={importInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleImportFile(file);
                }
              }}
            />

            <div className="mt-6 space-y-4">
              <p className="text-sm text-neutral-400">Only the first 50 rows will be shown as a preview.</p>

              {importRows.length ? (
                <div className="max-h-[360px] overflow-auto rounded-xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-neutral-950">
                      <tr className="text-left text-neutral-300">
                        <th className="p-3">name</th>
                        <th className="p-3">slug</th>
                        <th className="p-3">downloadUrl</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.map((row, index) => (
                        <tr key={index} className="border-t border-white/5 text-neutral-200">
                          <td className="p-3">{row.name}</td>
                          <td className="p-3">{row.slug}</td>
                          <td className="p-3">{row.downloadUrl}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-6 text-center">
                  <p className="text-sm text-neutral-300">Choose a CSV file to start</p>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => importInputRef.current?.click()}>
                  Choose file
                </Button>
                <Button
                  type="button"
                  disabled={importSaving || !importRows.length}
                  onClick={() => void confirmImport()}
                  className="bg-primary-500 text-white hover:bg-primary-400"
                >
                  {importSaving ? "Importing..." : "Confirm import"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
