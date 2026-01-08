import { z } from "zod";

export const navigationLinkSchema = z.object({
  label: z.string(),
  href: z.string(),
});

export const heroSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  cta: z
    .object({
      label: z.string(),
      href: z.string(),
    })
    .optional(),
});

export const settingsSchema = z.object({
  siteName: z.string(),
  tagline: z.string(),
  description: z.string(),
  hero: heroSchema.optional(),
  navigation: z.array(navigationLinkSchema).catch([]),
  social: z
    .object({
      github: z.string().url().optional(),
      twitter: z.string().url().optional(),
      linkedin: z.string().url().optional(),
    })
    .catch({}),
  seo: z
    .object({
      title: z.string(),
      description: z.string(),
      canonical: z.string().url().optional(),
    })
    .optional(),
});

export type Settings = z.infer<typeof settingsSchema>;

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
});

export type Category = z.infer<typeof categorySchema>;

export const vendorSchema = z.object({
  id: z.string(),
  name: z.string(),
  website: z.string().url(),
  support_email: z.string().email().optional(),
});

export type Vendor = z.infer<typeof vendorSchema>;

const pricingSchema = z.object({
  model: z.enum(["subscription", "one-time", "freemium", "enterprise"]),
  startingPrice: z.string().optional(),
  currency: z.string().optional(),
  billingCycle: z.string().optional(),
});

const imageSchema = z.object({
  key: z.string(),
  url: z.string(),
  alt: z.string(),
});

export const softwareSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  short_description: z.string(),
  description: z.string(),
  vendor_id: z.string(),
  category_ids: z.array(z.string()),
  download_url: z.string().url(),
  official_url: z.string().url(),
  trial: z.boolean().catch(false),
  pricing: pricingSchema.optional(),
  platforms: z.array(z.string()).catch([]),
  images: z.array(imageSchema).catch([]),
  tags: z.array(z.string()).catch([]),
  meta: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      canonical: z.string().url().optional(),
    })
    .optional(),
  schema: z.record(z.unknown()).optional(),
  related: z.array(z.string()).catch([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  status: z.enum(["draft", "published", "archived"]).catch("draft"),
  visibility: z.enum(["public", "private"]).catch("public"),
});

export type Software = z.infer<typeof softwareSchema>;
