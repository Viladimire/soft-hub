import { z } from "zod";

export const softwareMetaSchema = z.object({
  logoUrl: z.string().url("Invalid logo URL"),
  gallery: z.array(z.string().url()).default([]),
  heroImage: z.string().url().optional(),
});

export const softwareStatsSchema = z.object({
  downloads: z.number().int().nonnegative().default(0),
  views: z.number().int().nonnegative().default(0),
  rating: z.number().min(0).max(5).default(0),
  votes: z.number().int().nonnegative().default(0),
});

export const requirementsSchema = z.object({
  minimum: z.array(z.string()).optional(),
  recommended: z.array(z.string()).optional(),
});

export const changelogEntrySchema = z.object({
  version: z.string().min(1, "Enter a version number"),
  date: z.string().datetime({ message: "Invalid date format" }),
  highlights: z.array(z.string().min(1)).min(1, "Add at least one highlight"),
});

export const softwareSchema = z
  .object({
    name: z.string().min(3, "Software name is too short"),
    slug: z
      .string()
      .min(3)
      .regex(/^[a-z0-9-]+$/, "Use lowercase latin letters, numbers, and hyphens only"),
    summary: z.string().min(10, "Summary is too short"),
    description: z.string().min(30, "Detailed description is required"),
    version: z.string().min(1),
    sizeInBytes: z.number().int().nonnegative(),
    downloadUrl: z.string().url("Invalid download URL"),
    websiteUrl: z.string().url().optional().or(z.literal("")),
    releaseDate: z.string().datetime({ message: "Invalid date format" }),
    platforms: z.array(z.string()).min(1, "Select at least one platform"),
    categories: z.array(z.string()).min(1, "Select at least one category"),
    type: z.literal("standard").default("standard"),
    isFeatured: z.boolean().default(false),
    isTrending: z.boolean().default(false),
    stats: softwareStatsSchema,
    media: softwareMetaSchema,
    requirements: requirementsSchema.optional(),
    changelog: z.array(changelogEntrySchema).optional(),
  })
  .refine((data) => data.media.gallery.length > 0, {
    message: "Add at least one gallery image",
    path: ["media", "gallery"],
  });

export type SoftwareInput = z.infer<typeof softwareSchema>;
