import type { AbstractIntlMessages } from "next-intl";

import { defaultLocale, supportedLocales, type SupportedLocale } from "@/i18n/locales";

const enMessages = {
  nav: {
    brandTitle: "SOFT-HUB",
    brandSubtitle: "The biggest free software & games library",
    tabs: {
      windows: "Windows",
        mac: "macOS",
        linux: "Linux",
      },
      games: {
        label: "Games",
      },
      films: {
        label: "Films",
        title: "Premium film library",
        subtitle: "Coming soon",
        cta: "We are preparing a curated selection. Stay tuned!",
      },
      links: {
        home: "Home",
        software: "Library",
        collections: "Collections",
        insights: "Insights",
      },
      search: {
        openButton: "Quick search",
        placeholder: "Search for a product, category or platform...",
        themePlaceholder: "Select theme",
        recentTitle: "Recent searches",
        recentKeywords: {
          orbitSync: "Orbit Sync",
          chrome: "Chrome",
          winrar: "WinRAR",
        },
      },
      themeOptions: {
        system: "System",
        light: "Light",
        dark: "Dark",
      },
      actions: {
        submit: "Submit software",
      },
    },
    hero: {
      badge: "The biggest free software library",
      title: {
        highlight: "Download software & games",
        trailing: "100% free with direct links",
      },
      description:
        "Download thousands of free software titles and games with fast direct links from our servers — no annoying ads.",
      search: {
        placeholder: "Search for a product, capability or platform...",
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
        programs: "Free software",
        experts: "100% free",
        platforms: "Direct links",
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
        recommendedSoon: "Coming soon",
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
        android: "Android",
        ios: "iOS",
      },
      pricingOptions: {
        free: "Completely free",
      },
      freeBadge: "100% free",
      pricingChip: "Free",
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
          description: "Free desktop apps",
        },
        games: {
          label: "Games",
          description: "Free PC games",
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
      submit: {
        title: "Have a standout product?",
        description: "Share your project with the SOFT-HUB community and get a dedicated page with analytics.",
        cta: "Submit your software",
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
        title: "Collections",
        description: "Curated software packs are on the way. We’re preparing specialised bundles for every workflow.",
        ctas: {
          primary: "Back to home",
        },
      },
      insights: {
        title: "Insights",
        description: "Coming soon: analytics on top downloads, most-viewed products, and live trend tracking.",
        ctas: {
          trends: "Open Trends",
          primary: "Back to home",
        },
      },
    }
  }

const typedEnMessages: AbstractIntlMessages = enMessages;

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

  return messages;
};
