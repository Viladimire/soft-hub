import type { Platform, Software, SoftwareCategory, SoftwareType } from "@/lib/types/software";

export const featuredCategories: Array<{
  id: SoftwareCategory;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    id: "software",
    label: "Software",
    description: "Free software library for Windows, macOS, and Linux",
    icon: "package",
  },
  {
    id: "games",
    label: "Games",
    description: "Free games for PC",
    icon: "gamepad-2",
  },
  {
    id: "operating-systems",
    label: "Operating systems",
    description: "Desktop distributions and live environments",
    icon: "cpu",
  },
  {
    id: "multimedia",
    label: "Multimedia",
    description: "Media hubs, editors, and playback suites",
    icon: "film",
  },
  {
    id: "utilities",
    label: "Utilities",
    description: "Maintenance, cleanup, and power tools",
    icon: "wrench",
  },
  {
    id: "development",
    label: "Development",
    description: "Build, test, and deployment toolchains",
    icon: "code-2",
  },
  {
    id: "security",
    label: "Security",
    description: "Endpoint defence and privacy utilities",
    icon: "shield-check",
  },
  {
    id: "productivity",
    label: "Productivity",
    description: "Planning, writing, and team collaboration",
    icon: "bar-chart-3",
  },
  {
    id: "education",
    label: "Education",
    description: "Learning platforms and study assistants",
    icon: "book-open",
  },
];

export type SoftwareFilterOption = {
  id: string;
  label: string;
};

export const platformOptions: SoftwareFilterOption[] = [
  { id: "windows", label: "Windows" },
  { id: "mac", label: "macOS" },
  { id: "linux", label: "Linux" },
  { id: "android", label: "Android" },
  { id: "ios", label: "iOS" },
];

export const pricingOptions: Array<{ id: SoftwareType; label: string; chip: string }> = [
  { id: "free", label: "Completely free", chip: "Free" },
];

export const topPlatforms: Array<{ id: Platform; label: string; description: string }> = [
  {
    id: "windows",
    label: "Windows",
    description: "The broadest desktop ecosystem with deep enterprise adoption",
  },
  {
    id: "mac",
    label: "macOS",
    description: "Polished experiences and consistent performance across Apple devices",
  },
  {
    id: "linux",
    label: "Linux",
    description: "Open-source powerhouse for workstations, servers, and IoT",
  },
];

const createSoftware = (partial: Partial<Software>): Software => ({
  id: crypto.randomUUID(),
  slug: partial.slug ?? "",
  name: partial.name ?? "Untitled product",
  summary: partial.summary ?? "",
  description: partial.description ?? partial.summary ?? "",
  version: partial.version ?? "1.0.0",
  sizeInBytes: partial.sizeInBytes ?? 250 * 1024 * 1024,
  platforms: partial.platforms ?? ["windows"],
  categories: partial.categories ?? ["software"],
  type: partial.type ?? "free",
  websiteUrl: partial.websiteUrl ?? null,
  downloadUrl: partial.downloadUrl ?? "https://example.com/download",
  isFeatured: partial.isFeatured ?? false,
  releaseDate: partial.releaseDate ?? new Date().toISOString(),
  updatedAt: partial.updatedAt ?? new Date().toISOString(),
  createdAt: partial.createdAt ?? new Date().toISOString(),
  stats: partial.stats ?? {
    downloads: 0,
    views: 0,
    rating: 0,
    votes: 0,
  },
  media: partial.media ?? {
    logoUrl: "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=120&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1523473827534-86c5be8377aa?auto=format&fit=crop&w=600&q=80",
    ],
    heroImage:
      "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1200&q=80",
  },
  requirements: partial.requirements ?? {
    minimum: ["4GB RAM", "Intel Core i3", "500MB Storage"],
    recommended: ["8GB RAM", "Intel Core i5", "SSD Storage"],
  },
  changelog: partial.changelog ?? [
    {
      version: partial.version ?? "1.0.0",
      date: partial.releaseDate ?? new Date().toISOString(),
      highlights: ["Performance improvements", "Critical fixes"],
    },
  ],
});

export const mockSoftwares: Software[] = [
  createSoftware({
    slug: "spectrum-studio",
    name: "Spectrum Studio",
    summary: "3D-native UI creation suite built for live collaboration",
    description:
      "Spectrum Studio delivers a generative 3D design environment with rich component libraries, motion prototypes, and zero-friction handoff across front-end frameworks.",
    version: "2.6.1",
    sizeInBytes: 512 * 1024 * 1024,
    platforms: ["windows", "mac"],
    categories: ["software"],
    type: "free",
    isFeatured: true,
    stats: {
      downloads: 89200,
      views: 125000,
      rating: 4.7,
      votes: 2360,
    },
  }),
  createSoftware({
    slug: "orbit-sync",
    name: "Orbit Sync",
    summary: "Zero-trust file sync with edge encryption at scale",
    description:
      "Orbit Sync modernizes cloud file orchestration with per-object encryption, adaptive bandwidth controls, and an analytics cockpit for usage insights and governance.",
    version: "5.4.2",
    sizeInBytes: 320 * 1024 * 1024,
    platforms: ["windows", "mac", "linux"],
    categories: ["software"],
    type: "free",
    isFeatured: true,
    stats: {
      downloads: 154000,
      views: 290000,
      rating: 4.5,
      votes: 5400,
    },
  }),
  createSoftware({
    slug: "sentinel-guard",
    name: "Sentinel Guard",
    summary: "AI-native endpoint defense with live threat choreography",
    description:
      "Sentinel Guard blends behavioral AI and topology awareness to neutralize ransomware, lateral movement, and zero-day exploits with real-time mitigation playbooks.",
    version: "3.1.0",
    sizeInBytes: 280 * 1024 * 1024,
    platforms: ["windows", "linux"],
    categories: ["software"],
    type: "free",
    stats: {
      downloads: 189000,
      views: 410000,
      rating: 4.3,
      votes: 6100,
    },
  }),
  createSoftware({
    slug: "lumen-note",
    name: "Lumen Note",
    summary: "Second-brain workspace with Markdown-first collaboration",
    description:
      "Lumen Note powers knowledge workflows with ambient AI assistants, deep integrations, and multi-device sync designed for thinkers and product squads.",
    version: "1.8.4",
    sizeInBytes: 190 * 1024 * 1024,
    platforms: ["mac"],
    categories: ["software"],
    type: "free",
    stats: {
      downloads: 72000,
      views: 130000,
      rating: 4.8,
      votes: 980,
    },
  }),
  createSoftware({
    slug: "nebula-engine",
    name: "Nebula Engine",
    summary: "Lightweight WebGPU game runtime with cinematic pipelines",
    description:
      "Nebula Engine unlocks GPU-native rendering on the web with modular rendering stages, XR tooling, and automated asset optimization for indie teams.",
    version: "0.9.5",
    sizeInBytes: 640 * 1024 * 1024,
    platforms: ["windows", "linux"],
    categories: ["games"],
    type: "free",
    stats: {
      downloads: 45000,
      views: 96000,
      rating: 4.6,
      votes: 2300,
    },
  }),
];

export const getSoftwareBySlug = (slug: string) =>
  mockSoftwares.find((software) => software.slug === slug);

export const getRelatedSoftwares = (slug: string, limit = 3) =>
  mockSoftwares
    .filter((software) => software.slug !== slug)
    .slice(0, limit);
