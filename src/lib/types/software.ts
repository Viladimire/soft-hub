export type Platform = "windows" | "mac" | "linux" | "android" | "ios" | "web";

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

export type SoftwareType = "standard";

export type SoftwareRelease = {
  id: string;
  softwareId: string;
  version: string;
  fileName: string | null;
  additionalInfo: string | null;
  downloadUrl: string;
  sizeInBytes: number | null;
  releaseDate: string | null;
  downloadsCount: number;
  createdAt: string;
};

export type Software = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  description: string;
  version: string;
  sizeInBytes: number | null;
  platforms: Platform[];
  categories: SoftwareCategory[];
  type: SoftwareType;
  websiteUrl?: string | null;
  downloadUrl: string;
  isFeatured: boolean;
  isTrending: boolean;
  releaseDate: string | null;
  createdAt: string;
  updatedAt: string;
  releases?: SoftwareRelease[];
  stats: {
    downloads: number;
    views: number;
    rating: number;
    votes: number;
  };
  developer: Record<string, unknown>;
  features: string[];
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
