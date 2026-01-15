import { z } from "zod";

export const softwareMetaSchema = z.object({
  logoUrl: z.string().url("رابط الشعار غير صالح"),
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
  version: z.string().min(1, "أدخل رقم الإصدار"),
  date: z.string().datetime({ message: "صيغة التاريخ غير صحيحة" }),
  highlights: z.array(z.string().min(1)).min(1, "أضف نقطة واحدة على الأقل"),
});

export const softwareSchema = z
  .object({
    name: z.string().min(3, "اسم البرنامج يجب أن يكون أطول"),
    slug: z
      .string()
      .min(3)
      .regex(/^[a-z0-9-]+$/, "يجب استخدام أحرف لاتينية صغيرة وأرقام وشرطات"),
    summary: z.string().min(10, "الملخص يجب أن يكون أوضح"),
    description: z.string().min(30, "الوصف التفصيلي مطلوب"),
    version: z.string().min(1),
    sizeInBytes: z.number().int().nonnegative(),
    downloadUrl: z.string().url("رابط التحميل غير صالح"),
    websiteUrl: z.string().url().optional().or(z.literal("")),
    releaseDate: z.string().datetime({ message: "صيغة التاريخ غير صحيحة" }),
    platforms: z.array(z.string()).min(1, "اختر منصة واحدة على الأقل"),
    categories: z.array(z.string()).min(1, "اختر فئة واحدة على الأقل"),
    type: z.enum(["free", "freemium", "open-source"]).default("free"),
    isFeatured: z.boolean().default(false),
    stats: softwareStatsSchema,
    media: softwareMetaSchema,
    requirements: requirementsSchema.optional(),
    changelog: z.array(changelogEntrySchema).optional(),
  })
  .refine((data) => data.media.gallery.length > 0, {
    message: "أضف صورة واحدة على الأقل للبرنامج",
    path: ["media", "gallery"],
  });

export type SoftwareInput = z.infer<typeof softwareSchema>;
