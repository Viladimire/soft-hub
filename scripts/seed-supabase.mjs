import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

const envPath = resolve(process.cwd(), ".env.local");

if (!existsSync(envPath)) {
  console.error("❌ لم يتم العثور على ملف .env.local. شغّل setup-supabase-env.ps1 أولاً.");
  process.exit(1);
}

const env = readFileSync(envPath, "utf-8").split(/\r?\n/).reduce((acc, line) => {
  if (!line || line.trim().startsWith("#")) return acc;
  const [key, ...rest] = line.split("=");
  if (!key) return acc;
  acc[key.trim()] = rest.join("=").trim();
  return acc;
}, {});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("❌ يلزم توافر NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: {
    persistSession: false,
  },
});

const dataset = [
  {
    slug: "nova-desk",
    name: "Nova Desk",
    summary: "AI-powered productivity cockpit for cross-platform teams.",
    description:
      "Nova Desk unifies task orchestration, meeting insights, and AI copilots into a single desktop suite available on Windows, macOS, and Linux.",
    version: "3.4.1",
    sizeInBytes: 520 * 1024 * 1024,
    platforms: ["windows", "mac", "linux"],
    categories: ["productivity", "utilities"],
    type: "freemium",
    websiteUrl: "https://novadesk.app",
    downloadUrl: "https://download.novadesk.app/latest",
    isFeatured: true,
    releaseDate: "2024-08-12T00:00:00Z",
    createdAt: "2024-06-15T00:00:00Z",
    updatedAt: "2024-10-01T00:00:00Z",
    stats: { downloads: 182000, views: 420000, rating: 4.7, votes: 5600 },
    media: {
      logoUrl: "https://images.unsplash.com/photo-1551816230-ef5deaed4fb7?auto=format&fit=crop&w=120&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1523476893152-5e0d7d17c1d2?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1200&q=80",
      ],
      heroImage: "https://images.unsplash.com/photo-1527430253228-e93688616381?auto=format&fit=crop&w=1600&q=80",
    },
    requirements: {
      minimum: ["Intel i5", "8GB RAM", "DirectX 12"],
      recommended: ["Intel i7", "16GB RAM", "SSD Storage"],
    },
    changelog: [
      {
        version: "3.4.1",
        date: "2024-10-01",
        highlights: ["AI copilots for meetings", "Offline workspace sync"],
      },
    ],
  },
  {
    slug: "blueprint-studio",
    name: "Blueprint Studio",
    summary: "Generative UI/UX design suite with collaborative review.",
    description:
      "Blueprint Studio helps designers and product squads generate, prototype, and validate interfaces with AI-assisted flows and synchronized handoff to engineering.",
    version: "2.1.0",
    sizeInBytes: 628 * 1024 * 1024,
    platforms: ["mac", "windows"],
    categories: ["design"],
    type: "freemium",
    websiteUrl: "https://blueprint.studio",
    downloadUrl: "https://cdn.blueprint.studio/mac/latest",
    isFeatured: true,
    releaseDate: "2024-05-30T00:00:00Z",
    createdAt: "2024-01-12T00:00:00Z",
    updatedAt: "2024-09-18T00:00:00Z",
    stats: { downloads: 204000, views: 610000, rating: 4.8, votes: 7800 },
    media: {
      logoUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=120&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1580894894513-541e068a055d?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1200&q=80",
      ],
    },
    requirements: {
      minimum: ["Apple M1", "8GB RAM"],
      recommended: ["Apple M2", "16GB RAM", "Metal-capable GPU"],
    },
    changelog: [
      {
        version: "2.1.0",
        date: "2024-09-18",
        highlights: ["Realtime voice notes", "Figma sync 2.0"],
      },
    ],
  },
  {
    slug: "sentinel-core",
    name: "Sentinel Core",
    summary: "Endpoint security hub with zero-trust orchestration.",
    description:
      "Sentinel Core monitors workloads across desktop fleets with behavioral AI, rapid threat isolation, and encrypted telemetry exports.",
    version: "5.2.3",
    sizeInBytes: 450 * 1024 * 1024,
    platforms: ["windows", "linux"],
    categories: ["security"],
    type: "freemium",
    websiteUrl: "https://sentinelcore.io",
    downloadUrl: "https://download.sentinelcore.io/latest",
    isFeatured: true,
    releaseDate: "2024-04-09T00:00:00Z",
    createdAt: "2023-12-30T00:00:00Z",
    updatedAt: "2024-07-22T00:00:00Z",
    stats: { downloads: 158000, views: 280000, rating: 4.6, votes: 5200 },
    media: {
      logoUrl: "https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=120&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=1200&q=80",
      ],
    },
    requirements: {
      minimum: ["Intel i3", "8GB RAM"],
      recommended: ["Intel i7", "16GB RAM"],
    },
    changelog: [
      {
        version: "5.2.3",
        date: "2024-07-22",
        highlights: ["Playbook automation", "Kernel telemetry dashboard"],
      },
    ],
  },
  {
    slug: "orbit-sync",
    name: "Orbit Sync",
    summary: "Zero-trust file sync with granular analytics dashboards.",
    description:
      "Orbit Sync modernizes file synchronization with end-to-end encryption, usage analytics, and smart bandwidth shaping for distributed teams.",
    version: "6.0.0",
    sizeInBytes: 390 * 1024 * 1024,
    platforms: ["windows", "mac", "linux"],
    categories: ["productivity", "utilities"],
    type: "freemium",
    websiteUrl: "https://orbit-sync.com",
    downloadUrl: "https://orbit-sync.com/download",
    isFeatured: false,
    releaseDate: "2024-03-11T00:00:00Z",
    createdAt: "2023-11-08T00:00:00Z",
    updatedAt: "2024-06-04T00:00:00Z",
    stats: { downloads: 142000, views: 320000, rating: 4.5, votes: 5100 },
    media: {
      logoUrl: "https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=120&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1527430253228-e93688616381?auto=format&fit=crop&w=1200&q=80",
      ],
    },
    requirements: {
      minimum: ["Dual-core CPU", "4GB RAM"],
      recommended: ["Quad-core CPU", "8GB RAM", "SSD Storage"],
    },
    changelog: [
      {
        version: "6.0.0",
        date: "2024-06-04",
        highlights: ["Zero-trust upgrades", "Adaptive sync"],
      },
    ],
  },
  {
    slug: "nebula-engine",
    name: "Nebula Engine",
    summary: "WebGPU game runtime with cinematic pipelines for indies.",
    description:
      "Nebula Engine unlocks GPU-native rendering on the web and desktop with modular rendering stages, XR tooling, and automated asset pipelines.",
    version: "1.2.5",
    sizeInBytes: 670 * 1024 * 1024,
    platforms: ["windows", "linux"],
    categories: ["development", "multimedia"],
    type: "open-source",
    websiteUrl: "https://nebulaengine.dev",
    downloadUrl: "https://github.com/nebulaengine/releases/latest/download",
    isFeatured: false,
    releaseDate: "2024-07-05T00:00:00Z",
    createdAt: "2024-02-14T00:00:00Z",
    updatedAt: "2024-09-10T00:00:00Z",
    stats: { downloads: 78000, views: 150000, rating: 4.4, votes: 2600 },
    media: {
      logoUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=120&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=80",
      ],
    },
    requirements: {
      minimum: ["AMD Ryzen 5", "16GB RAM", "8GB VRAM"],
      recommended: ["AMD Ryzen 7", "32GB RAM", "12GB VRAM"],
    },
    changelog: [
      {
        version: "1.2.5",
        date: "2024-09-10",
        highlights: ["Physically-based rendering", "XR toolkit"],
      },
    ],
  },
  {
    slug: "quantum-crunch",
    name: "Quantum Crunch",
    summary: "High-performance data cruncher for analysts & researchers.",
    description:
      "Quantum Crunch accelerates large dataset exploration, blending GPU-accelerated transformation pipelines with collaborative notebooks.",
    version: "4.0.2",
    sizeInBytes: 820 * 1024 * 1024,
    platforms: ["windows", "mac"],
    categories: ["development", "utilities"],
    type: "freemium",
    websiteUrl: "https://quantumcrunch.io",
    downloadUrl: "https://downloads.quantumcrunch.io/app",
    isFeatured: true,
    releaseDate: "2024-02-21T00:00:00Z",
    createdAt: "2023-09-30T00:00:00Z",
    updatedAt: "2024-05-08T00:00:00Z",
    stats: { downloads: 212000, views: 470000, rating: 4.9, votes: 8900 },
    media: {
      logoUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=120&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1580894894513-541e068a055d?auto=format&fit=crop&w=1200&q=80",
      ],
    },
    requirements: {
      minimum: ["Intel i5", "16GB RAM"],
      recommended: ["Intel i9", "32GB RAM", "RTX 3060"],
    },
    changelog: [
      {
        version: "4.0.2",
        date: "2024-05-08",
        highlights: ["GPU acceleration", "Notebook sharing"],
      },
    ],
  },
  {
    slug: "lumen-note",
    name: "Lumen Note",
    summary: "Second-brain workspace with Markdown-first collaboration.",
    description:
      "Lumen Note powers knowledge workflows with ambient AI assistants, deep integrations, and multi-device sync designed for thinkers and product squads.",
    version: "2.3.0",
    sizeInBytes: 210 * 1024 * 1024,
    platforms: ["mac", "windows"],
    categories: ["productivity", "education"],
    type: "free",
    websiteUrl: "https://lumennote.app",
    downloadUrl: "https://lumennote.app/download",
    isFeatured: false,
    releaseDate: "2024-01-18T00:00:00Z",
    createdAt: "2023-08-20T00:00:00Z",
    updatedAt: "2024-04-22T00:00:00Z",
    stats: { downloads: 98000, views: 210000, rating: 4.6, votes: 3900 },
    media: {
      logoUrl: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=120&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1200&q=80",
      ],
    },
    requirements: {
      minimum: ["Dual-core CPU", "4GB RAM"],
      recommended: ["Quad-core CPU", "8GB RAM"],
    },
    changelog: [
      {
        version: "2.3.0",
        date: "2024-04-22",
        highlights: ["AI summarizer", "Offline notebooks"],
      },
    ],
  },
  {
    slug: "aria-spectra",
    name: "Aria Spectra",
    summary: "Immersive DAW for musicians with spectral AI tools.",
    description:
      "Aria Spectra delivers pro-grade music production with spectral remixing, AI stem separation, and collaborative cloud sessions.",
    version: "6.5.0",
    sizeInBytes: 1540 * 1024 * 1024,
    platforms: ["mac", "windows"],
    categories: ["multimedia"],
    type: "freemium",
    websiteUrl: "https://ariaspectra.io",
    downloadUrl: "https://cdn.ariaspectra.io/latest",
    isFeatured: false,
    releaseDate: "2024-03-03T00:00:00Z",
    createdAt: "2022-10-11T00:00:00Z",
    updatedAt: "2024-07-19T00:00:00Z",
    stats: { downloads: 134000, views: 260000, rating: 4.3, votes: 3400 },
    media: {
      logoUrl: "https://images.unsplash.com/photo-1485579149621-3123dd979885?auto=format&fit=crop&w=120&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1464375117522-1311d6a5b81b?auto=format&fit=crop&w=1200&q=80",
      ],
    },
    requirements: {
      minimum: ["Intel i5", "8GB RAM", "SSD"],
      recommended: ["Intel i7", "16GB RAM", "Audio interface"],
    },
    changelog: [
      {
        version: "6.5.0",
        date: "2024-07-19",
        highlights: ["Spectral mixer", "Collab Jam Rooms"],
      },
    ],
  },
  {
    slug: "atlas-ide",
    name: "Atlas IDE",
    summary: "Lightweight AI-enhanced IDE for cloud-native builders.",
    description:
      "Atlas IDE streamlines microservice development with AI refactors, Kubernetes manifests wizards, and built-in performance profiling.",
    version: "1.9.4",
    sizeInBytes: 480 * 1024 * 1024,
    platforms: ["windows", "linux"],
    categories: ["development"],
    type: "free",
    websiteUrl: "https://atlaside.dev",
    downloadUrl: "https://atlaside.dev/download",
    isFeatured: true,
    releaseDate: "2024-09-01T00:00:00Z",
    createdAt: "2024-05-10T00:00:00Z",
    updatedAt: "2024-09-30T00:00:00Z",
    stats: { downloads: 164000, views: 350000, rating: 4.8, votes: 6400 },
    media: {
      logoUrl: "https://images.unsplash.com/photo-1580894894513-541e068a055d?auto=format&fit=crop&w=120&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1200&q=80",
      ],
    },
    requirements: {
      minimum: ["Quad-core CPU", "8GB RAM"],
      recommended: ["8-core CPU", "16GB RAM", "Docker"],
    },
    changelog: [
      {
        version: "1.9.4",
        date: "2024-09-30",
        highlights: ["AI refactor", "Service map visualization"],
      },
    ],
  },
  {
    slug: "vertex-guard",
    name: "Vertex Guard",
    summary: "Next-gen antivirus with behavior sandboxing.",
    description:
      "Vertex Guard shields desktops from zero-day exploits with behavior sandboxing, memory inspection, and threat intelligence feeds.",
    version: "7.3.2",
    sizeInBytes: 430 * 1024 * 1024,
    platforms: ["windows"],
    categories: ["security"],
    type: "freemium",
    websiteUrl: "https://vertexguard.io",
    downloadUrl: "https://vertexguard.io/download",
    isFeatured: false,
    releaseDate: "2024-06-24T00:00:00Z",
    createdAt: "2023-05-30T00:00:00Z",
    updatedAt: "2024-08-16T00:00:00Z",
    stats: { downloads: 99000, views: 210000, rating: 4.2, votes: 3100 },
    media: {
      logoUrl: "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=120&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1580894894513-541e068a055d?auto=format&fit=crop&w=1200&q=80",
      ],
    },
    requirements: {
      minimum: ["Dual-core CPU", "4GB RAM"],
      recommended: ["Quad-core CPU", "8GB RAM"],
    },
    changelog: [
      {
        version: "7.3.2",
        date: "2024-08-16",
        highlights: ["Memory inspector", "Threat intelligence feeds"],
      },
    ],
  },
  {
    slug: "aether-notion",
    name: "Aether Notion",
    summary: "Knowledge base tool with smart graph traversal.",
    description:
      "Aether Notion lets distributed teams build and traverse knowledge graphs, complete with AI-powered insights and automated relation suggestions.",
    version: "3.2.1",
    sizeInBytes: 275 * 1024 * 1024,
    platforms: ["windows", "mac"],
    categories: ["productivity", "education"],
    type: "freemium",
    websiteUrl: "https://aethern.com",
    downloadUrl: "https://aethern.com/download",
    isFeatured: false,
    releaseDate: "2024-04-18T00:00:00Z",
    createdAt: "2023-12-11T00:00:00Z",
    updatedAt: "2024-07-02T00:00:00Z",
    stats: { downloads: 73000, views: 150000, rating: 4.5, votes: 2800 },
    media: {
      logoUrl: "https://images.unsplash.com/photo-1483478550801-ceba5fe50e8e?auto=format&fit=crop&w=120&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=80",
      ],
    },
    requirements: {
      minimum: ["Dual-core CPU", "4GB RAM"],
      recommended: ["Quad-core CPU", "8GB RAM"],
    },
    changelog: [
      {
        version: "3.2.1",
        date: "2024-07-02",
        highlights: ["Graph AI guides", "Smart relation suggestions"],
      },
    ],
  },
  {
    slug: "ignite-learn",
    name: "Ignite Learn",
    summary: "STEM learning lab with interactive simulations.",
    description:
      "Ignite Learn delivers STEM curricula with interactive simulations, live feedback, and educator dashboards for classrooms.",
    version: "5.5.0",
    sizeInBytes: 360 * 1024 * 1024,
    platforms: ["windows", "mac"],
    categories: ["education"],
    type: "free",
    websiteUrl: "https://ignitelearn.io",
    downloadUrl: "https://ignitelearn.io/download",
    isFeatured: true,
    releaseDate: "2024-03-29T00:00:00Z",
    createdAt: "2023-10-05T00:00:00Z",
    updatedAt: "2024-06-18T00:00:00Z",
    stats: { downloads: 118000, views: 230000, rating: 4.8, votes: 5400 },
    media: {
      logoUrl: "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=120&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80",
      ],
    },
    requirements: {
      minimum: ["Intel i5", "8GB RAM"],
      recommended: ["Intel i7", "16GB RAM", "GPU with 4GB"],
    },
    changelog: [
      {
        version: "5.5.0",
        date: "2024-06-18",
        highlights: ["Physics lab pack", "Educator analytics"],
      },
    ],
  },
  {
    slug: "flux-render",
    name: "Flux Render",
    summary: "Realtime renderer for ArchViz & digital twins.",
    description:
      "Flux Render is a realtime rendering toolkit for architecture and digital twin teams, offering photorealistic lighting, BIM sync, and VR walkthroughs.",
    version: "7.1.2",
    sizeInBytes: 2100 * 1024 * 1024,
    platforms: ["windows"],
    categories: ["design", "multimedia"],
    type: "freemium",
    websiteUrl: "https://fluxrender.com",
    downloadUrl: "https://fluxrender.com/download/windows",
    isFeatured: false,
    releaseDate: "2024-05-07T00:00:00Z",
    createdAt: "2022-02-18T00:00:00Z",
    updatedAt: "2024-08-22T00:00:00Z",
    stats: { downloads: 64000, views: 140000, rating: 4.1, votes: 2100 },
    media: {
      logoUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=120&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
      ],
    },
    requirements: {
      minimum: ["Intel i5", "16GB RAM", "6GB VRAM"],
      recommended: ["Intel i9", "32GB RAM", "12GB VRAM"],
    },
    changelog: [
      {
        version: "7.1.2",
        date: "2024-08-22",
        highlights: ["BIM live sync", "Ray-traced caustics"],
      },
    ],
  },
  {
    slug: "echo-scribe",
    name: "Echo Scribe",
    summary: "Transcription & dubbing studio for media teams.",
    description:
      "Echo Scribe transcribes, translates, and dubs media with neural voices, built-in editor, and collaboration timeline.",
    version: "3.8.0",
    sizeInBytes: 420 * 1024 * 1024,
    platforms: ["mac", "windows"],
    categories: ["multimedia", "productivity"],
    type: "freemium",
    websiteUrl: "https://echoscribe.io",
    downloadUrl: "https://echoscribe.io/download",
    isFeatured: false,
    releaseDate: "2024-02-04T00:00:00Z",
    createdAt: "2023-06-14T00:00:00Z",
    updatedAt: "2024-05-12T00:00:00Z",
    stats: { downloads: 94000, views: 210000, rating: 4.4, votes: 3600 },
    media: {
      logoUrl: "https://images.unsplash.com/photo-1485579149621-3123dd979885?auto=format&fit=crop&w=120&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
      ],
    },
    requirements: {
      minimum: ["Quad-core CPU", "8GB RAM"],
      recommended: ["8-core CPU", "16GB RAM", "GPU acceleration"],
    },
    changelog: [
      {
        version: "3.8.0",
        date: "2024-05-12",
        highlights: ["Neural dubbing", "Collaboration timeline"],
      },
    ],
  },
  {
    slug: "pilot-hub",
    name: "Pilot Hub",
    summary: "Project pilot console for product discovery squads.",
    description:
      "Pilot Hub combines backlog discovery, experiment tracking, and customer feedback analytics to guide product squads.",
    version: "2.6.3",
    sizeInBytes: 305 * 1024 * 1024,
    platforms: ["windows", "mac"],
    categories: ["productivity"],
    type: "freemium",
    websiteUrl: "https://pilothub.app",
    downloadUrl: "https://pilothub.app/download",
    isFeatured: false,
    releaseDate: "2024-07-14T00:00:00Z",
    createdAt: "2024-02-23T00:00:00Z",
    updatedAt: "2024-09-03T00:00:00Z",
    stats: { downloads: 73000, views: 160000, rating: 4.3, votes: 2500 },
    media: {
      logoUrl: "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=120&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1523476893152-5e0d7d17c1d2?auto=format&fit=crop&w=1200&q=80",
      ],
    },
    requirements: {
      minimum: ["Dual-core CPU", "4GB RAM"],
      recommended: ["Quad-core CPU", "8GB RAM"],
    },
    changelog: [
      {
        version: "2.6.3",
        date: "2024-09-03",
        highlights: ["Experiment hub", "Feedback analytics"],
      },
    ],
  },
  {
    slug: "stellar-sim",
    name: "Stellar Sim",
    summary: "Space mission sandbox with physics-accurate simulations.",
    description:
      "Stellar Sim is a gamified simulation environment for aerospace students and enthusiasts, featuring mission planning and orbital mechanics.",
    version: "1.4.0",
    sizeInBytes: 1800 * 1024 * 1024,
    platforms: ["windows"],
    categories: ["education", "multimedia"],
    type: "freemium",
    websiteUrl: "https://stellarsim.com",
    downloadUrl: "https://stellarsim.com/download",
    isFeatured: true,
    releaseDate: "2024-08-05T00:00:00Z",
    createdAt: "2023-11-18T00:00:00Z",
    updatedAt: "2024-09-22T00:00:00Z",
    stats: { downloads: 128000, views: 330000, rating: 4.7, votes: 5100 },
    media: {
      logoUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=120&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80",
      ],
    },
    requirements: {
      minimum: ["Intel i5", "12GB RAM", "GTX 960"],
      recommended: ["Intel i7", "16GB RAM", "RTX 2060"],
    },
    changelog: [
      {
        version: "1.4.0",
        date: "2024-09-22",
        highlights: ["Lunar missions", "VR cockpit"],
      },
    ],
  },
  {
    slug: "cloud-chisel",
    name: "Cloud Chisel",
    summary: "Serverless deployment studio with cost observability.",
    description:
      "Cloud Chisel simplifies shipping serverless apps with blue/green preview, live cost breakdowns, and policy guards.",
    version: "2.8.1",
    sizeInBytes: 260 * 1024 * 1024,
    platforms: ["windows", "mac", "linux"],
    categories: ["development"],
    type: "freemium",
    websiteUrl: "https://cloudchisel.dev",
    downloadUrl: "https://cloudchisel.dev/download",
    isFeatured: false,
    releaseDate: "2024-05-01T00:00:00Z",
    createdAt: "2023-07-12T00:00:00Z",
    updatedAt: "2024-07-27T00:00:00Z",
    stats: { downloads: 91000, views: 190000, rating: 4.4, votes: 3100 },
    media: {
      logoUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=120&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1200&q=80",
      ],
    },
    requirements: {
      minimum: ["Dual-core CPU", "4GB RAM"],
      recommended: ["Quad-core CPU", "8GB RAM", "Docker"],
    },
    changelog: [
      {
        version: "2.8.1",
        date: "2024-07-27",
        highlights: ["Cost observability", "Policy guards"],
      },
    ],
  },
  {
    slug: "guardian-backup",
    name: "Guardian Backup",
    summary: "Cross-platform backup suite with ransomware shield.",
    description:
      "Guardian Backup automates incremental backups across platforms with ransomware detection and immutable snapshot recovery.",
    version: "9.2.0",
    sizeInBytes: 330 * 1024 * 1024,
    platforms: ["windows", "mac", "linux"],
    categories: ["utilities", "security"],
    type: "freemium",
    websiteUrl: "https://guardianbackup.io",
    downloadUrl: "https://guardianbackup.io/download",
    isFeatured: false,
    releaseDate: "2024-01-28T00:00:00Z",
    createdAt: "2022-09-14T00:00:00Z",
    updatedAt: "2024-03-21T00:00:00Z",
    stats: { downloads: 156000, views: 290000, rating: 4.6, votes: 4700 },
    media: {
      logoUrl: "https://images.unsplash.com/photo-1483478550801-ceba5fe50e8e?auto=format&fit=crop&w=120&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80",
      ],
    },
    requirements: {
      minimum: ["Dual-core CPU", "4GB RAM"],
      recommended: ["Quad-core CPU", "8GB RAM"],
    },
    changelog: [
      {
        version: "9.2.0",
        date: "2024-03-21",
        highlights: ["Immutable snapshots", "Ransomware heuristics"],
      },
    ],
  },
  {
    slug: "stride-fitness",
    name: "Stride Fitness",
    summary: "Personal trainer app with adaptive workout generator.",
    description:
      "Stride Fitness tailors workout plans with sensor integration, AI feedback, and cross-device syncing for athletes and casual users alike.",
    version: "3.1.5",
    sizeInBytes: 190 * 1024 * 1024,
    platforms: ["windows", "mac"],
    categories: ["utilities", "multimedia"],
    type: "free",
    websiteUrl: "https://stridefitness.app",
    downloadUrl: "https://stridefitness.app/download",
    isFeatured: false,
    releaseDate: "2024-06-10T00:00:00Z",
    createdAt: "2023-09-02T00:00:00Z",
    updatedAt: "2024-08-01T00:00:00Z",
    stats: { downloads: 68000, views: 140000, rating: 4.2, votes: 2100 },
    media: {
      logoUrl: "https://images.unsplash.com/photo-1502767089025-6572583495b0?auto=format&fit=crop&w=120&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?auto=format&fit=crop&w=1200&q=80",
      ],
    },
    requirements: {
      minimum: ["Dual-core CPU", "4GB RAM"],
      recommended: ["Quad-core CPU", "8GB RAM"],
    },
    changelog: [
      {
        version: "3.1.5",
        date: "2024-08-01",
        highlights: ["Adaptive workouts", "Wearable sync"],
      },
    ],
  },
  {
    slug: "catalyst-forge",
    name: "Catalyst Forge",
    summary: "Low-code automation builder for operations teams.",
    description:
      "Catalyst Forge lets operations teams design automations, build connectors, and measure ROI with zero-code dashboards.",
    version: "1.7.2",
    sizeInBytes: 240 * 1024 * 1024,
    platforms: ["windows", "mac"],
    categories: ["productivity", "utilities"],
    type: "freemium",
    websiteUrl: "https://catalystforge.io",
    downloadUrl: "https://catalystforge.io/download",
    isFeatured: false,
    releaseDate: "2024-02-08T00:00:00Z",
    createdAt: "2023-05-22T00:00:00Z",
    updatedAt: "2024-04-29T00:00:00Z",
    stats: { downloads: 59000, views: 120000, rating: 4.3, votes: 1900 },
    media: {
      logoUrl: "https://images.unsplash.com/photo-1549921296-3ecf9fbc71fc?auto=format&fit=crop&w=120&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
      ],
    },
    requirements: {
      minimum: ["Dual-core CPU", "4GB RAM"],
      recommended: ["Quad-core CPU", "8GB RAM"],
    },
    changelog: [
      {
        version: "1.7.2",
        date: "2024-04-29",
        highlights: ["Automation builder", "ROI dashboards"],
      },
    ],
  },
  {
    slug: "ember-mail",
    name: "Ember Mail",
    summary: "Secure desktop mail client with zero-knowledge encryption.",
    description:
      "Ember Mail wraps modern email workflows with zero-knowledge encryption, calendar sync, and identity protections.",
    version: "5.0.0",
    sizeInBytes: 310 * 1024 * 1024,
    platforms: ["windows", "mac", "linux"],
    categories: ["utilities", "security"],
    type: "freemium",
    websiteUrl: "https://embermail.io",
    downloadUrl: "https://embermail.io/download",
    isFeatured: false,
    releaseDate: "2024-05-12T00:00:00Z",
    createdAt: "2022-12-09T00:00:00Z",
    updatedAt: "2024-07-17T00:00:00Z",
    stats: { downloads: 103000, views: 230000, rating: 4.4, votes: 3600 },
    media: {
      logoUrl: "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=120&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1527430253228-e93688616381?auto=format&fit=crop&w=1200&q=80",
      ],
    },
    requirements: {
      minimum: ["Dual-core CPU", "4GB RAM"],
      recommended: ["Quad-core CPU", "8GB RAM"],
    },
    changelog: [
      {
        version: "5.0.0",
        date: "2024-07-17",
        highlights: ["Zero-knowledge upgrade", "Calendar sync"],
      },
    ],
  },
  {
    slug: "glide-share",
    name: "Glide Share",
    summary: "High-speed media sharing hub with live collaboration.",
    description:
      "Glide Share makes sharing large media projects effortless with live reviews, annotations, and accelerate transfers.",
    version: "2.4.3",
    sizeInBytes: 420 * 1024 * 1024,
    platforms: ["windows", "mac", "linux"],
    categories: ["multimedia", "productivity"],
    type: "freemium",
    websiteUrl: "https://glideshare.com",
    downloadUrl: "https://glideshare.com/download",
    isFeatured: false,
    releaseDate: "2024-06-04T00:00:00Z",
    createdAt: "2023-03-14T00:00:00Z",
    updatedAt: "2024-08-25T00:00:00Z",
    stats: { downloads: 87000, views: 180000, rating: 4.2, votes: 2600 },
    media: {
      logoUrl: "https://images.unsplash.com/photo-1446057032654-9d8885db76c6?auto=format&fit=crop&w=120&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
      ],
    },
    requirements: {
      minimum: ["Dual-core CPU", "4GB RAM"],
      recommended: ["Quad-core CPU", "8GB RAM"],
    },
    changelog: [
      {
        version: "2.4.3",
        date: "2024-08-25",
        highlights: ["Accelerated transfers", "Annotation suite"],
      },
    ],
  },
  {
    slug: "forge-learn",
    name: "Forge Learn",
    summary: "Developer education platform with interactive labs.",
    description:
      "Forge Learn provides guided labs, live coding sandboxes, and AI mentors for aspiring developers and teams.",
    version: "1.5.0",
    sizeInBytes: 285 * 1024 * 1024,
    platforms: ["windows", "mac", "linux"],
    categories: ["education", "development"],
    type: "freemium",
    websiteUrl: "https://forgelearn.dev",
    downloadUrl: "https://forgelearn.dev/download",
    isFeatured: false,
    releaseDate: "2024-04-05T00:00:00Z",
    createdAt: "2023-07-08T00:00:00Z",
    updatedAt: "2024-07-12T00:00:00Z",
    stats: { downloads: 92000, views: 200000, rating: 4.6, votes: 3800 },
    media: {
      logoUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=120&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
      ],
    },
    requirements: {
      minimum: ["Dual-core CPU", "4GB RAM"],
      recommended: ["Quad-core CPU", "8GB RAM"],
    },
    changelog: [
      {
        version: "1.5.0",
        date: "2024-07-12",
        highlights: ["AI mentor", "Live coding sandboxes"],
      },
    ],
  },
  {
    slug: "horizon-desk",
    name: "Horizon Desk",
    summary: "Workspace dashboard with unified notifications & focus.",
    description:
      "Horizon Desk consolidates all workstreams, notifications, and focus modes into a unified desktop hub with AI summarization.",
    version: "2.2.0",
    sizeInBytes: 320 * 1024 * 1024,
    platforms: ["windows", "mac"],
    categories: ["productivity"],
    type: "freemium",
    websiteUrl: "https://horizondesk.app",
    downloadUrl: "https://horizondesk.app/download",
    isFeatured: false,
    releaseDate: "2024-03-16T00:00:00Z",
    createdAt: "2023-05-04T00:00:00Z",
    updatedAt: "2024-05-28T00:00:00Z",
    stats: { downloads: 101000, views: 210000, rating: 4.4, votes: 3400 },
    media: {
      logoUrl: "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=120&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
      ],
    },
    requirements: {
      minimum: ["Dual-core CPU", "4GB RAM"],
      recommended: ["Quad-core CPU", "8GB RAM"],
    },
    changelog: [
      {
        version: "2.2.0",
        date: "2024-05-28",
        highlights: ["Notification hub", "Focus modes"],
      },
    ],
  },
  {
    slug: "pulse-gamer",
    name: "Pulse Gamer",
    summary: "Game launcher with performance booster and social hub.",
    description:
      "Pulse Gamer optimizes PC games with performance tweaks, driver updates, and a tight-knit social hub for squads.",
    version: "4.4.1",
    sizeInBytes: 510 * 1024 * 1024,
    platforms: ["windows"],
    categories: ["multimedia"],
    type: "free",
    websiteUrl: "https://pulsegamer.gg",
    downloadUrl: "https://pulsegamer.gg/download",
    isFeatured: false,
    releaseDate: "2024-07-07T00:00:00Z",
    createdAt: "2023-04-19T00:00:00Z",
    updatedAt: "2024-08-15T00:00:00Z",
    stats: { downloads: 172000, views: 380000, rating: 4.5, votes: 6200 },
    media: {
      logoUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=120&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1518672019642-1ba9a2f0f1f4?auto=format&fit=crop&w=1200&q=80",
      ],
    },
    requirements: {
      minimum: ["Intel i5", "8GB RAM", "GTX 1050"],
      recommended: ["Intel i7", "16GB RAM", "RTX 2060"],
    },
    changelog: [
      {
        version: "4.4.1",
        date: "2024-08-15",
        highlights: ["Performance booster", "Squad hub"],
      },
    ],
  },
  {
    slug: "stream-shaper",
    name: "Stream Shaper",
    summary: "Live streaming studio with adaptive overlays & analytics.",
    description:
      "Stream Shaper empowers creators with adaptive overlays, audience analytics, and a plugin marketplace for live streaming.",
    version: "3.9.0",
    sizeInBytes: 600 * 1024 * 1024,
    platforms: ["windows", "mac"],
    categories: ["multimedia"],
    type: "freemium",
    websiteUrl: "https://streamshaper.tv",
    downloadUrl: "https://streamshaper.tv/download",
    isFeatured: false,
    releaseDate: "2024-02-12T00:00:00Z",
    createdAt: "2022-08-29T00:00:00Z",
    updatedAt: "2024-04-30T00:00:00Z",
    stats: { downloads: 148000, views: 320000, rating: 4.4, votes: 5000 },
    media: {
      logoUrl: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=120&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=80",
      ],
    },
    requirements: {
      minimum: ["Intel i5", "8GB RAM", "GTX 960"],
      recommended: ["Intel i7", "16GB RAM", "RTX 2070"],
    },
    changelog: [
      {
        version: "3.9.0",
        date: "2024-04-30",
        highlights: ["Adaptive overlays", "Plugin marketplace"],
      },
    ],
  }
];

const rows = dataset.map((item) => ({
  slug: item.slug,
  name: item.name,
  summary: item.summary,
  description: item.description,
  version: item.version,
  size_in_bytes: item.sizeInBytes,
  platforms: item.platforms,
  categories: item.categories,
  type: item.type,
  website_url: item.websiteUrl,
  download_url: item.downloadUrl,
  is_featured: item.isFeatured,
  release_date: item.releaseDate,
  updated_at: item.updatedAt ?? item.releaseDate,
  created_at: item.createdAt ?? item.releaseDate,
  stats: item.stats,
  media: item.media,
  requirements: item.requirements ?? null,
  changelog: item.changelog ?? null,
}));

try {
  console.log(`🚀 Seeding ${rows.length} software entries ...`);
  const { error } = await supabase.from("software").upsert(rows, { onConflict: "slug" });
  if (error) {
    console.error("❌ فشل إدخال البيانات: ", error.message);
    process.exit(1);
  }
  console.log("✅ تم إدخال البيانات بنجاح في جدول software.");
  process.exit(0);
} catch (error) {
  console.error("❌ حدث خطأ أثناء التنفيذ:", error?.message ?? error);
  process.exit(1);
}
