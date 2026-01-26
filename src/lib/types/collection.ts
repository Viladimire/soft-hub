import type { Software } from "@/lib/types/software";

export type CollectionTheme = {
  background?: string;
  foreground?: string;
  gradientStart?: string;
  gradientEnd?: string;
  pattern?: string;
};

export type Collection = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  accentColor?: string | null;
  theme: CollectionTheme;
  isFeatured: boolean;
  displayOrder: number;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items: CollectionItem[];
};

export type CollectionSummary = Omit<Collection, "items"> & {
  itemsCount: number;
};

export type CollectionItem = {
  collectionId: string;
  softwareId: string;
  softwareSlug?: string;
  position: number;
  highlight?: string | null;
  createdAt: string;
  updatedAt: string;
  software?: Software;
};

export type UpsertCollectionInput = {
  id?: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  accentColor?: string | null;
  theme?: CollectionTheme;
  isFeatured?: boolean;
  displayOrder?: number;
  publishedAt?: string | null;
  items: Array<{
    softwareId?: string;
    softwareSlug?: string;
    position: number;
    highlight?: string | null;
  }>;
};
