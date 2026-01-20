export type Platform = "windows" | "mac" | "linux" | "android" | "ios";

export type SoftwareCategory =
  | "software"
  | "games"
  | "operating-systems"
  | "multimedia"
  | "utilities"
  | "development"
  | "security"
  | "productivity"
  | "education";

export type ReleaseStatus = "draft" | "published" | "archived";

export type SoftwareType = "free";

export type Software = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  description: string;
  version: string;
  sizeInBytes: number;
  platforms: Platform[];
  categories: SoftwareCategory[];
  type: SoftwareType;
  websiteUrl?: string | null;
  downloadUrl: string;
  isFeatured: boolean;
  releaseDate: string;
  updatedAt: string;
  createdAt: string;
  stats: {
    downloads: number;
    views: number;
    rating: number;
    votes: number;
  };
  media: {
    logoUrl: string;
    gallery: string[];
    heroImage?: string;
  };
  requirements: {
    minimum?: string[];
    recommended?: string[];
  };
  changelog?: Array<{
    version: string;
    date: string;
    highlights: string[];
  }>;
};
