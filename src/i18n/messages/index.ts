import type { AbstractIntlMessages } from "next-intl";

import { defaultLocale, supportedLocales, type SupportedLocale } from "@/i18n/locales";

const enMessages = {
  nav: {
    brandTitle: "SOFT-HUB",
    brandSubtitle: "The curated software & games library",
    tabs: {
      windows: "Windows",
      mac: "macOS",
      linux: "Linux",
    },
    links: {
      home: "Home",
      software: "Library",
      games: "Games",
      collections: "Collections",
      insights: "Insights",
    },
    hero: {
      badge: "Your trusted software launchpad",
      title: {
        highlight: "Download software & games",
        trailing: "with direct, verified links",
      },
      description:
        "Explore thousands of curated software titles and games with fast direct links from our servers — no annoying ads.",
      search: {
        placeholder: "Search for a product, capability or platform...",
        placeholderDetailed: "Search the library (e.g. photo editor, Windows tools, security)",
        chips: {
          chrome: "Chrome",
          winrar: "WinRAR",
          games: "Games",
        },
        cta: "Start search",
      },
      cta: {
        primary: "Browse the library",
        secondary: "View curated picks",
      },
      stats: {
        programs: "Software available",
        downloads: "Direct downloads served",
        platforms: "Supported platforms",
      },
      platforms: {
        title: "Featured platforms",
        subtitle: "Start with the ecosystem your team targets",
        badge: "Updated weekly",
        items: {
          windows: {
            label: "Windows",
            description: "The broadest desktop ecosystem with deep enterprise adoption",
          },
          mac: {
            label: "macOS",
            description: "Polished experiences and consistent performance across Apple devices",
          },
          linux: {
            label: "Linux",
            description: "Open-source powerhouse for workstations, servers, and IoT",
          },
        },
        titleFilms: "Premium film library",
        subtitleFilms: "Hand-picked desktop releases for cinephiles",
        comingSoon: "Coming soon",
        lockedLibraryTitle: "Film catalog is locked",
        lockedLibrarySubtitle: "We are preparing a curated selection. Stay tuned!",
      },
      categories: {
        title: "Discover categories",
        subtitle: "Curated groups to help you pick the right tools for your next project.",
        badge: "Featured",
        subscribe: "Subscribe for updates",
        labels: {
          software: "Software",
          games: "Games",
        },
      },
      games: {
        title: "Flagship games for Windows & macOS",
        subtitle: "Cinematic adventures tuned for desktop performance and controller precision.",
        cta: "Browse the games library",
        badges: {
          windows: "Windows",
          mac: "macOS",
        },
        items: {
          aurora: {
            title: "Aurora Odyssey",
            description: "Sci-fi campaign with ray-traced lighting and adaptive soundtrack.",
            platforms: {
              windows: "Windows",
              mac: "macOS",
            },
          },
          skyforge: {
            title: "Skyforge Legends",
            description: "Co-op raids and ranked PvP with precision controller support.",
            platforms: {
              windows: "Windows",
            },
          },
          echo: {
            title: "Echo Drift",
            description: "Anti-gravity racing at 120 FPS with native gamepad support on Mac.",
            platforms: {
              mac: "macOS",
              windows: "Windows",
            },
          },
        },
      },
    },
    filters: {
      title: "Smart filters",
      reset: "Reset",
      searchLabel: "Search",
      searchPlaceholder: "Find a product or specific capability...",
      search: {
        placeholder: "Search for a product, feature or platform...",
        clear: "Clear search",
        chips: {
          chrome: "Chrome",
          winrar: "WinRAR",
          games: "Games",
        },
      },
      platformLabel: "Platform",
      platformAll: "All platforms",
      platformHint: "Select one or more platforms",
      typeLabel: "License type",
      typeHint: "Pick one or more availability options",
      pricingLabel: "",
      pricingAll: "",
      categoriesLabel: "Categories",
      collapse: "Collapse",
      expand: "Expand",
      sortLabel: "Sort by",
      sortDescription: "Adjust how results are displayed in an instant.",
      sortOptions: {
        latest: "Newest first",
        popular: "Most popular",
        name: "Alphabetical",
      },
      activeFilters: "{count} active filters",
      activeSummary: "{count, number} active filters",
      tabs: {
        all: "All",
        recommended: "Recommended",
      },
      groups: {
        platforms: "Platforms",
        pricing: "",
      },
      recommendedMessage: "We'll soon add personalized recommendations based on your preferences and search history.",
      subscribeCta: "Subscribe for updates",
      clear: "Clear",
      platformOptions: {
        windows: "Windows",
        mac: "macOS",
        linux: "Linux",
      },
      typeOptions: {
        free: {
          label: "Open access",
          description: "Download without purchase requirements",
        },
        freemium: {
          label: "Freemium",
          description: "Core features included with optional upgrades",
        },
        paid: {
          label: "Paid",
          description: "One-time purchase or commercial license",
        },
        "open-source": {
          label: "Open source",
          description: "Community-driven projects with source code access",
        },
      },
      pricingOptions: {
        free: "",
      },
      freeBadge: "",
      pricingChip: "",
      categoryLabels: {
        software: "Software",
        games: "Games",
        "operating-systems": "Operating systems",
        multimedia: "Multimedia",
        utilities: "Utilities",
        development: "Development",
        security: "Security",
        productivity: "Productivity",
        education: "Education",
      },
      categoryPills: {
        all: {
          label: "All software",
          description: "Show everything",
        },
        software: {
          label: "Software",
          description: "Desktop applications",
        },
        games: {
          label: "Games",
          description: "PC and console titles",
        },
        "operating-systems": {
          label: "Operating systems",
          description: "Desktop OS distributions",
        },
        multimedia: {
          label: "Multimedia",
          description: "Media and creativity tools",
        },
        utilities: {
          label: "Utilities",
          description: "Power tools and optimizers",
        },
        development: {
          label: "Development",
          description: "Build and deployment tooling",
        },
        security: {
          label: "Security",
          description: "Protect endpoints and data",
        },
        productivity: {
          label: "Productivity",
          description: "Organise work and teams",
        },
        education: {
          label: "Education",
          description: "Learning and training apps",
        },
      },
    },
    softwareCard: {
      downloadsLabel: "Downloads",
      ratingLabel: "Rating",
      updatedLabel: "Updated",
      viewsLabel: "Views",
      versionLabel: "Version",
      reviewsLabel: "{count, number} reviews",
      featuredBadge: "Featured",
      quickView: "Quick view",
      share: "Share",
      favorite: "Favorite",
      downloadCount: "{count, number} downloads",
      viewDetails: "View details",
      downloadNow: "Download now",
      notAvailable: "Not available",
      shareCopied: "Link copied!",
      shareFailed: "Couldn't copy the link",
      quickViewTitle: "Quick glance at {name}",
      quickViewSubtitle: "Everything worth knowing before you add it to your stack.",
      featuresLabel: "Key features",
      moreFeatures: "+{count} more",
      noFeatures: "No features were listed for this software yet.",
      categoriesLabel: "Categories",
    },
    softwareGrid: {
      heading: {
        default: "Explore the software library",
        count: "Found {count, number} products",
      },
      status: {
        loading: "Updating results...",
        updating: "Updating",
      },
      fallbackBadge: "Demo data",
      actions: {
        loadMore: "Load more results",
        loadingMore: "Loading...",
      },
    },
    emptyState: {
      noResults: {
        title: "No matching results",
        description: "Try widening your filters or reset them to browse the full collection.",
        action: "Reset filters",
      },
      noSoftware: {
        title: "No software is published yet",
        description: "We're actively curating new products. Explore available categories or check back soon.",
        action: "Browse categories",
      },
      error: {
        title: "We couldn't load the results",
        description: "Check your connection and try again in a moment.",
        action: "Retry",
      },
    },
    sidebar: {
      trending: {
        title: "Trending software",
        badge: "Top",
        empty: "No trending software right now",
        viewAll: "View full list",
      },
      pricing: {
        title: "",
        includeTag: "",
        viewAll: "",
        badges: {
          free: "",
        },
      },
      request: {
        title: "Request a software",
        description: "Ask the SOFT-HUB team to review and add a new entry to the catalog.",
        cta: "Request a software",
      },
      community: {
        title: "SOFT-HUB community",
        links: {
          forums: {
            label: "Expert forums",
            description: "Join conversations with power users and industry specialists",
          },
          alternatives: {
            label: "Alternatives guide",
            description: "Compare products and uncover the best fit for your workflow",
          },
          trends: {
            label: "Trend report",
            description: "See which software categories are accelerating this month",
          },
        },
      },
    },
    pages: {
      collections: {
        title: "Curated collections",
        subtitle: "Discover themed bundles of software, hand-picked to accelerate your next project.",
        hero: {
          badge: "Curated drops in flight",
          title: "SOFT-HUB Collections",
          description:
            "Collections will gather themed bundles of software, games, and learning material with editorial notes, compatibility badges, and quick download triggers.",
          actions: {
            primary: "Browse current library",
            secondary: "Request a software",
          },
          features: {
            launch: {
              title: "Launch playbook",
              items: {
                0: "Editorial drops refreshed every two weeks",
                1: "Global filters by platform and category",
                2: "Offline JSON bundle for self-hosting mirrors",
              },
            },
            contributors: {
              title: "For contributors",
              items: {
                0: "Request workflow with review SLAs",
                1: "Spotlight for verified publishers",
                2: "Analytics dashboard for collection performance",
              },
            },
          },
        },
        draft: {
          title: "Draft collection line-up",
          description: "Here is what the editorial team is sequencing right now.",
          items: {
            productivity: {
              title: "Hyper-productivity toolkit",
              entries: "18 apps",
              summary: "A curated stack for remote teams blending AI copilots, sync engines, and focus aides.",
              focus: "Focus: Productivity & collaboration",
            },
            creator: {
              title: "Creator studio essentials",
              entries: "22 apps",
              summary: "Video, audio, and graphics workflows optimised for solo creators with direct-download installers.",
              focus: "Focus: Multimedia & content",
            },
            security: {
              title: "Hardening your workstation",
              entries: "15 apps",
              summary: "Security-first suite covering backups, firewalls, and privacy tooling ready for regulated environments.",
              focus: "Focus: Security & utilities",
            },
          },
        },
        empty: {
          title: "No collections yet",
          description: "We’re still arranging the featured bundles. Check back soon or explore the catalog.",
          cta: "Back to home",
        },
        cards: {
          featured: "Featured",
          itemsLabel: "{count} apps",
          explore: "Explore collection",
          ariaLabel: "View collection {title}",
        },
        cardStats: {
          priority: "Priority",
          created: "Created",
          items: "Items",
        },
        highlights: {
          heading: "Highlights",
          default: "This collection is curated to help you start fast with trusted software.",
        },
      },
      collectionDetail: {
        programsHeading: "Included software",
        description: "Dive into every app inside this themed bundle.",
        itemsUnit: "apps",
        hero: {
          featuredProgramsLabel: "Featured programs",
          stats: {
            items: "Items",
            year: "Year",
            order: "Order",
          },
        },
        platformsLabel: "Platforms",
        updatedLabel: "Last updated",
        backLink: "Back to collections",
        missingSoftware: "This software entry is no longer available.",
        exploreButton: "Open software page",
        downloadButton: "Download",
      },
      search: {
        title: "Search the library",
        subtitle: "Refine the filters to discover software, games and operating systems.",
        titleWithQuery: "Results for “{query}”",
        subtitleWithQuery: "These entries matched your search term.",
        emptyHint: "Try another keyword or reset the filters to explore all software.",
      },
      categories: {
        default: {
          title: "Browse our library",
          subtitle: "Adjust the filters to discover software that matches your workflow.",
        },
        software: {
          title: "Software catalog",
          subtitle: "Essential desktop applications curated for productivity and work.",
        },
        games: {
          title: "Games library",
          subtitle: "Playable and open-source titles ready for your next session.",
        },
        operatingSystems: {
          title: "Operating systems",
          subtitle: "Discover desktop distributions and alternative OS builds.",
        },
        multimedia: {
          title: "Multimedia studio",
          subtitle: "Video, audio and creative suites for your content pipeline.",
        },
        utilities: {
          title: "Utilities & tools",
          subtitle: "System helpers, drivers and power utilities to optimise performance.",
        },
      },
      insights: {
        title: "Insights",
        description: "Coming soon: analytics on top downloads, most-viewed products, and live trend tracking.",
        hero: {
          badge: "Analytics in progress",
          title: "SOFT-HUB Insights",
          description:
            "We are building a data layer that tracks downloads, engagement, and emerging trends across software, games, and upcoming film content. Full analytics dashboards launch soon.",
          features: {
            coming: {
              title: "What’s coming",
              items: {
                0: "Download spikes and software velocity",
                1: "Category heatmaps with regional filters",
                2: "Weekly digest for publisher partners",
              },
            },
            community: {
              title: "For the community",
              items: {
                0: "Snapshot dashboards embedded in collections",
                1: "Public API for open-source mashups",
                2: "Alerts about trending tools & new drops",
              },
            },
          },
        },
        backlog: {
          title: "Launch backlog",
          description: "A timeline of analytics modules under construction.",
          items: {
            weeklyReport: {
              title: "Weekly download report",
              description: "Exportable CSV and charts for the top 500 titles across software and games.",
              status: "Status: Final QA · ETA Q2 2026",
            },
            regionalInsights: {
              title: "Region-specific insights",
              description: "Breakdowns by locale with filters for OS, pricing model, and release window.",
              status: "Status: In development · ETA Q3 2026",
            },
            searchAnalytics: {
              title: "Real-time search analytics",
              description: "Live feed of top search terms and click-through rates surfaced in the library.",
              status: "Status: Design review · ETA Q4 2026",
            },
          },
        },
        ctas: {
          trends: "Open Trends preview",
          primary: "View most downloaded",
        },
      },
      insightsTrends: {
        title: "Trends",
        description: "This page is under development. For now, you can browse the most popular titles from the library.",
        actions: {
          popular: "View most downloaded",
          back: "Back to Insights",
        },
      },
      request: {
        title: "Request a software",
        description: "Send a request for a software title and our team will review and add it to the library when available.",
        hint: "This page is being improved and a request form will be available soon.",
        form: {
          fields: {
            name: "Software name",
            website: "Official website (optional)",
            notes: "Notes (optional)",
          },
          placeholders: {
            name: "e.g. Notion",
            website: "https://example.com",
            notes: "Tell us why you need it, key features, or trusted sources...",
          },
          actions: {
            submit: "Submit request",
            loading: "Submitting...",
          },
          status: {
            success: "Thanks! Your request has been received.",
          },
          errors: {
            nameRequired: "Please enter a software name.",
            generic: "Something went wrong. Please try again.",
          },
        },
      },
      softwareDetail: {
        header: {
          badges: {
            featured: "Featured",
          },
          actions: {
            website: "Website",
            download: "Download",
          },
          stats: {
            version: "Version",
            size: "Size",
            downloads: "Downloads",
            updated: "Last updated",
          },
          platforms: {
            label: "Platforms:",
          },
          back: "Back to library",
        },
        related: {
          title: "Related software",
          viewMore: "View more",
        },
        downloadCard: {
          primaryCta: "Download now",
          verified: "Verified download link",
          stats: {
            version: "Version",
            size: "Size",
            updated: "Updated",
          },
        },
      },
      films: {
        hero: {
          badge: "Launch in progress",
          title: "SOFT-HUB Premier Films",
          description:
            "Our film catalogue is in active production. Expect a launch line-up that blends independent gems, sci-fi epics, and limited series pilots with global subtitles.",
          actions: {
            primary: "Browse the library",
            secondary: "Back to home",
          },
          features: {
            expect: {
              title: "What to expect",
              items: {
                0: "Native 4K encodes with HDR grading",
                1: "Multi-language subtitle packs at launch",
                2: "Secure direct downloads & adaptive streaming",
              },
            },
            timeline: {
              title: "Timeline",
              items: {
                0: "Q2 2026 — Beta access for early adopters",
                1: "Q3 2026 — Public rollout with 50 curated titles",
                2: "Q4 2026 — Interactive watch parties & live chat",
              },
            },
          },
        },
        notify: {
          title: "Be first to know when films go live",
          placeholder: "you@example.com",
          actions: {
            submit: "Notify me",
            loading: "Sending...",
          },
          status: {
            success: "Thanks! You will receive launch updates.",
            disabled: "Notifications are temporarily disabled while we finalise the roll-out.",
            error: "Something went wrong. Please try again in a moment.",
          },
        },
        upcoming: {
          title: "Upcoming feature slate",
          description: "A snapshot of titles currently in clearance and mastering.",
          rating: "Rating {rating}",
          items: {
            neonOrbit: {
              title: "Neon Orbit",
              synopsis:
                "Cyber-noir thriller following a data broker who uncovers a neural heist escalating into a city-wide blackout.",
              releaseWindow: "Q2 2026",
              genres: {
                0: "Sci-fi",
                1: "Thriller",
              },
              rating: "PG-13",
            },
            lastTransmission: {
              title: "Last Transmission",
              synopsis:
                "Found-footage space drama about an isolated crew decoding a distress signal that predates humanity.",
              releaseWindow: "Q3 2026",
              genres: {
                0: "Drama",
                1: "Mystery",
              },
              rating: "PG",
            },
            skylineClub: {
              title: "Skyline Club",
              synopsis:
                "Stylised crime musical charting rival crews as they battle via underground VR showcase battles.",
              releaseWindow: "Holiday 2026",
              genres: {
                0: "Musical",
                1: "Crime",
              },
              rating: "PG-13",
            },
          },
        },
        pillars: {
          title: "Launch pillars",
          description: "Our roadmap for the film experience inside SOFT-HUB.",
          items: {
            curation: {
              label: "Curation-first",
              description:
                "Every drop is hand-picked with focus on cinematic storytelling across emerging markets and independent studios.",
            },
            partnerships: {
              label: "Studio partnerships",
              description:
                "We are onboarding distributors to deliver day-one releases with transparent licensing for SOFT-HUB members.",
            },
            premieres: {
              label: "Community premieres",
              description:
                "Expect live watch parties, director AMAs, and synced subtitles across supported locales at launch.",
            },
          },
        },
        loop: {
          title: "Stay in the loop",
          description: "Until launch, explore our active collections and insights.",
          actions: {
            collections: "Curated collections",
            insights: "Insights & reports",
            forums: "Community forums",
          },
        },
      },
      communityAlternatives: {
        hero: {
          badge: "Comparisons underway",
          title: "SOFT-HUB Alternatives",
          description:
            "We are building a research-driven index of software and game alternatives with feature matrices, community scoring, and migration notes.",
          actions: {
            primary: "Explore current library",
            secondary: "Back to home",
          },
          features: {
            analysis: {
              title: "Curated analyses",
              items: {
                0: "Benchmarks for performance, memory, and footprint",
                1: "Migration playbooks between popular suites",
                2: "Side-by-side comparisons with platform coverage",
              },
            },
            signals: {
              title: "Data signals",
              items: {
                0: "Uptime and security advisories feed",
                1: "Pricing and availability change alerts",
                2: "AI-assisted recommendation summaries",
              },
            },
          },
        },
        infoCards: {
          requestPipeline: {
            title: "Request pipeline",
            description:
              "Contributors will be able to request alternative suggestions with evidence-backed notes and change logs.",
            badge: "Planned",
          },
          exports: {
            title: "Export formats",
            description: "CSV and JSON exports for IT teams rolling out internal catalogues.",
          },
        },
        checklist: {
          title: "Alternative launch checklist",
          description: "Initiatives we are finishing before the comparison hub goes live.",
          items: {
            taxonomy: {
              title: "Feature taxonomy",
              description:
                "Normalising capabilities across productivity, multimedia, security, and education tooling.",
            },
            migration: {
              title: "Migration guides",
              description:
                "Step-by-step walkthroughs for teams switching between ecosystems and pricing models.",
            },
            reviews: {
              title: "Community reviews",
              description:
                "Verified publisher quotes and IT admin feedback loops feeding into alternative scoring.",
            },
          },
          cta: "Join the forums beta",
        },
      },

      communityForums: {
        hero: {
          badge: "Community beta",
          title: "SOFT-HUB Forums",
          description:
            "A collaborative space for troubleshooting, feature requests, and curated recommendations. We are preparing dedicated channels for publishers, power users, and regional communities.",
          actions: {
            primary: "Browse community updates",
            secondary: "Back to home",
          },
          features: {
            works: {
              title: "What’s in the works",
              items: {
                0: "Topic channels for troubleshooting and showcases",
                1: "Publisher Q&A and roadmap votes",
                2: "Regional hubs with locale-specific threads",
              },
            },
            perks: {
              title: "Community perks",
              items: {
                0: "Badge system tied to verified publishers",
                1: "Weekly office hours with SOFT-HUB moderators",
                2: "Leaderboard for helpful guides and reviews",
              },
            },
          },
        },
        infoCards: {
          moderators: {
            title: "Call for moderators",
            description:
              "We will invite early moderators from our active contributors list once beta access begins.",
            badge: "Beta",
          },
          feedback: {
            title: "Early access feedback",
            description: "Forum beta testers will help shape tagging, search, and spam handling workflows.",
          },
        },
        checklist: {
          title: "Community launch checklist",
          description: "Elements we are finalising before opening the doors.",
          items: {
            templates: {
              title: "Discussion templates",
              description: "Structured post formats for help requests, showcases, and release notes.",
            },
            moderation: {
              title: "Moderation tooling",
              description: "Role-based permissions with automated spam triage and escalation policies.",
            },
            localization: {
              title: "Localization rollout",
              description:
                "Preparing locale-specific categories and automated translation suggestions.",
            },
          },
          cta: "Explore curated collections",
        },
      },
    },
  },
} as const;

const cloneMessages = () => JSON.parse(JSON.stringify(enMessages)) as typeof enMessages;

const typedEnMessages: AbstractIntlMessages = enMessages;
void cloneMessages;

const catalog: Partial<Record<SupportedLocale, AbstractIntlMessages>> = {
  en: typedEnMessages,
};

const isSupportedLocale = (value: string): value is SupportedLocale =>
  supportedLocales.includes(value as SupportedLocale);

export const loadMessages = async (locale: string): Promise<AbstractIntlMessages> => {
  const normalizedLocale = isSupportedLocale(locale)
    ? locale
    : (defaultLocale as SupportedLocale);

  const typedCatalog = catalog as Partial<Record<SupportedLocale, AbstractIntlMessages>>;
  const fallbackLocale = defaultLocale as SupportedLocale;
  const messages = typedCatalog[normalizedLocale] ?? typedCatalog[fallbackLocale];

  if (!messages) {
    throw new Error(`Missing i18n messages for locale: ${normalizedLocale}`);
  }

  const record = messages as unknown as Record<string, unknown>;
  const nav = (record.nav ?? null) as null | Record<string, unknown>;

  if (!nav) {
    return messages;
  }

  const liftKeys = ["hero", "filters", "softwareCard", "softwareGrid", "emptyState", "sidebar", "pages"] as const;
  const lifted: Record<string, unknown> = {};

  for (const key of liftKeys) {
    if (!(key in record) && key in nav) {
      lifted[key] = nav[key];
    }
  }

  if (Object.keys(lifted).length === 0) {
    return messages;
  }

  return {
    ...record,
    ...lifted,
  } as AbstractIntlMessages;
};
