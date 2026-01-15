import type { AbstractIntlMessages } from "next-intl";

import { defaultLocale, supportedLocales, type SupportedLocale } from "@/i18n/locales";

const catalog = {
  ar: {
    nav: {
      brandTitle: "SOFT-HUB",
      brandSubtitle: "منصة اكتشاف البرمجيات الذكية",
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
        home: "الرئيسية",
        software: "المكتبة",
        collections: "المجموعات",
        insights: "تحليلات",
      },
      search: {
        openButton: "بحث سريع",
        placeholder: "ابحث عن برنامج، فئة، أو منصة...",
        themePlaceholder: "اختيار الوضع",
        recentTitle: "أحدث عمليات البحث",
        recentKeywords: {
          orbitSync: "Orbit Sync",
          design: "Design",
          webgpu: "WebGPU",
        },
      },
      themeOptions: {
        system: "النظام",
        light: "فاتح",
        dark: "داكن",
      },
      actions: {
        submit: "أضف برنامجًا",
      },
    },
    hero: {
      badge: "منصة واحدة لاكتشاف البرمجيات الأكثر تأثيرًا",
      title: {
        highlight: "استعد لمستقبل البرمجيات",
        trailing: "حلول ذكية، سكندرية، وجاهزة للنمو.",
      },
      description:
        "SOFT-HUB يجمع أفضل أدوات العمل، الإنتاجية، والأمان في مكان واحد مع تحليلات حيّة، توصيات مخصصة، وتجارب تحميل فائقة السرعة.",
      search: {
        placeholder: "ابحث عن برنامج، وظيفة، أو منصة...",
        chips: {
          ai: "AI",
          webgpu: "WebGPU",
          productivity: "Productivity",
        },
      },
      cta: {
        primary: "تصفّح المكتبة",
        secondary: "شاهد المختارات الخاصة",
      },
      stats: {
        programs: "برامج مختارة",
        experts: "خبراء قيّموا",
        platforms: "منصات مدعومة",
      },
      platforms: {
        title: "منصات مميزة",
        subtitle: "ابدأ حسب النظام الذي يستهدفه فريقك",
        badge: "محدّث أسبوعيًا",
        items: {
          windows: {
            label: "Windows",
            description: "أكبر منظومة مكتبية مع انتشار قوي في المؤسسات",
          },
          mac: {
            label: "macOS",
            description: "تجارب مصقولة وأداء ثابت لمستخدمي أجهزة آبل",
          },
          linux: {
            label: "Linux",
            description: "منصة مفتوحة المصدر للخوادم وأجهزة التطوير",
          },
        },
        titleFilms: "Premium film library",
        subtitleFilms: "Cinematic experiences tailored for desktop screens",
        comingSoon: "Coming soon",
        lockedLibraryTitle: "Film catalog is locked",
        lockedLibrarySubtitle: "We are preparing a curated selection. Stay tuned!",
      },
      categories: {
        title: "اختر مسارك",
        recommendedSoon: "سنضيف قريبًا توصيات مخصصة حسب تفضيلاتك وسجل بحثك.",
        subscribe: "اشترك في التحديثات",
        labels: {
          design: "التصميم",
          development: "التطوير",
          productivity: "الإنتاجية",
          security: "الحماية",
        },
      },
      games: {
        title: "ألعاب مميزة لويندوز وماك",
        subtitle: "تجارب سينمائية محسّنة للأجهزة المكتبية مع أداء عالي وإضاءة متقدمة.",
        cta: "استكشف مكتبة الألعاب",
        badges: {
          windows: "Windows",
          mac: "macOS",
        },
        items: {
          aurora: {
            title: "Aurora Odyssey",
            description: "رحلة خيال علمي بدعم تتبع الأشعة وموسيقى تفاعلية.",
            platforms: {
              windows: "Windows",
              mac: "macOS",
            },
          },
          skyforge: {
            title: "Skyforge Legends",
            description: "تحالفات PvE/PvP مع دعم وحدات تحكم متقدّم وإطارات ثابتة.",
            platforms: {
              windows: "Windows",
            },
          },
          echo: {
            title: "Echo Drift",
            description: "سباقات مستقبلية بسرعة 120FPS مع دعم يد التحكم على الماك.",
            platforms: {
              mac: "macOS",
              windows: "Windows",
            },
          },
        },
      },
    },
    filters: {
      title: "المرشحات الذكية",
      reset: "إعادة ضبط",
      searchLabel: "بحث",
      searchPlaceholder: "البحث عن برنامج أو وظيفة محددة...",
      search: {
        placeholder: "ابحث عن برنامج أو ميزة أو منصة...",
        clear: "مسح البحث",
        chips: {
          automation: "الأتمتة",
          design: "التصميم",
          analytics: "التحليلات",
        },
      },
      platformLabel: "المنصة",
      platformAll: "جميع المنصات",
      platformHint: "يمكنك تفعيل أكثر من منصة",
      pricingLabel: "الأسعار",
      pricingAll: "كافة الخطط",
      categoriesLabel: "تصنيفات",
      collapse: "طيّ الخيارات",
      expand: "توسيع الخيارات",
      sortLabel: "ترتيب حسب",
      sortDescription: "اضبط طريقة عرض النتائج بحسب ما يناسبك.",
      sortOptions: {
        latest: "الأحدث",
        popular: "الأكثر شيوعًا",
        name: "أبجديًا",
      },
      activeFilters: "{count} مرشح فعال",
      activeSummary: "{count, number} مرشح مفعل",
      tabs: {
        all: "الكل",
        recommended: "مقترح",
      },
      groups: {
        platforms: "منصات",
        pricing: "الأسعار",
      },
      recommendedMessage: "سنضيف قريبًا توصيات مخصصة حسب تفضيلاتك وسجل بحثك.",
      subscribeCta: "اشترك في التحديثات",
      clear: "مسح",
      platformOptions: {
        windows: "Windows",
        mac: "macOS",
        linux: "Linux",
      },
      pricingOptions: {
        free: "مجاني بالكامل",
        freemium: "خطة مجانية ومدفوعة",
        "open-source": "مفتوح المصدر",
      },
      pricingChip: "خطة التسعير",
      categoryLabels: {
        design: "التصميم",
        development: "التطوير",
        productivity: "الإنتاجية",
        security: "الحماية",
      },
      categoryPills: {
        all: {
          label: "جميع البرامج",
          description: "أظهر كل النتائج",
        },
        desktop: {
          label: "سطح المكتب",
          description: "مثالي لويندوز وماك",
        },
      },
    },
    softwareCard: {
      downloadsLabel: "تنزيلات",
      ratingLabel: "التقييم",
      updatedLabel: "آخر تحديث",
      viewsLabel: "مشاهدات",
      versionLabel: "الإصدار",
      reviewsLabel: "{count, number} تقييم",
      featuredBadge: "مميز",
      quickView: "معاينة",
      share: "مشاركة",
      favorite: "مفضلة",
      downloadCount: "{count, number} عملية تنزيل",
      viewDetails: "استعرض التفاصيل",
      downloadNow: "تنزيل الآن",
      notAvailable: "غير متوفر",
      shareCopied: "تم نسخ الرابط!",
      shareFailed: "تعذّر نسخ الرابط",
      quickViewTitle: "نظرة سريعة على {name}",
      quickViewSubtitle: "كل ما تحتاج معرفته قبل الاعتماد عليه في فريقك.",
    },
    softwareGrid: {
      heading: {
        default: "استكشف مكتبة البرامج",
        count: "تم العثور على {count, number} برنامج",
      },
      status: {
        loading: "جارٍ تحديث النتائج...",
        updating: "تحديث النتائج",
      },
      fallbackBadge: "بيانات تجريبية",
      actions: {
        loadMore: "تحميل المزيد",
        loadingMore: "جارٍ التحميل",
      },
    },
    emptyState: {
      noResults: {
        title: "لا توجد نتائج مطابقة",
        description: "جرّب تعديل معايير البحث أو قم بإعادة تعيين الفلاتر لعرض المزيد من النتائج.",
        action: "إعادة تعيين الفلاتر",
      },
      noSoftware: {
        title: "لا توجد برامج متاحة حاليًا",
        description: "نعمل على تحديث المكتبة باستمرار. تفقد الفئات المتاحة أو عد لاحقًا.",
        action: "استعرض الفئات",
      },
      error: {
        title: "تعذّر تحميل النتائج",
        description: "يرجى التحقق من اتصالك بالإنترنت أو إعادة المحاولة بعد لحظات.",
        action: "إعادة المحاولة",
      },
    },
    sidebar: {
      trending: {
        title: "برامج رائجة",
        badge: "مميز",
        viewAll: "عرض القائمة الكاملة",
      },
      pricing: {
        title: "خطط الأسعار",
        includeTag: "يتضمن وسم {chip}",
        viewAll: "كل الأسعار",
        badges: {
          free: "مجاني",
          freemium: "فريميوم",
          "open-source": "مفتوح المصدر",
        },
      },
      submit: {
        title: "هل لديك برنامج مميز؟",
        description: "شارك مشروعك مع مجتمع SOFT-HUB واحصل على صفحة مخصصة وتحليلات أداء.",
        cta: "أرسل برنامجك",
      },
      community: {
        title: "مجتمع SOFT-HUB",
        links: {
          forums: {
            label: "منتدى الخبراء",
            description: "انضم إلى نقاشات المستخدمين والخبراء التقنيين",
          },
          alternatives: {
            label: "دليل البدائل",
            description: "قارن بين البرامج واعثر على البديل الأنسب",
          },
          trends: {
            label: "تقرير التوجهات",
            description: "تعرّف على أكثر البرمجيات نموًا هذا الشهر",
          },
        },
      },
    },
  },
  en: {
    nav: {
      brandTitle: "SOFT-HUB",
      brandSubtitle: "Intelligent software discovery hub",
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
          design: "Design",
          webgpu: "WebGPU",
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
      badge: "One platform to discover the most impactful software",
      title: {
        highlight: "Get ready for the future of software",
        trailing: "Smart, scalable solutions ready to grow.",
      },
      description:
        "SOFT-HUB brings together the best productivity, security and workflow tools with live analytics, personalized recommendations and blazing-fast downloads.",
      search: {
        placeholder: "Search for a product, capability or platform...",
        chips: {
          ai: "AI",
          webgpu: "WebGPU",
          productivity: "Productivity",
        },
      },
      cta: {
        primary: "Browse the library",
        secondary: "View curated picks",
      },
      stats: {
        programs: "Featured products",
        experts: "Expert reviewers",
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
        title: "Choose your track",
        recommendedSoon: "We'll soon add personalized recommendations based on your preferences and search history.",
        subscribe: "Subscribe for updates",
        labels: {
          design: "Design",
          development: "Development",
          productivity: "Productivity",
          security: "Security",
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
          automation: "Automation",
          design: "Design",
          analytics: "Analytics",
        },
      },
      platformLabel: "Platform",
      platformAll: "All platforms",
      platformHint: "Select one or more platforms",
      pricingLabel: "Pricing",
      pricingAll: "All plans",
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
        pricing: "Pricing",
      },
      recommendedMessage: "We'll soon add personalized recommendations based on your preferences and search history.",
      subscribeCta: "Subscribe for updates",
      clear: "Clear",
      platformOptions: {
        windows: "Windows",
        mac: "macOS",
        linux: "Linux",
      },
      pricingOptions: {
        free: "Completely free",
        freemium: "Free & paid tiers",
        "open-source": "Open source",
      },
      pricingChip: "Pricing tier",
      categoryLabels: {
        design: "Design",
        development: "Development",
        productivity: "Productivity",
        security: "Security",
      },
      categoryPills: {
        all: {
          label: "All software",
          description: "Show everything",
        },
        desktop: {
          label: "Desktop",
          description: "Perfect for Windows & macOS",
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
        viewAll: "View full list",
      },
      pricing: {
        title: "Pricing plans",
        includeTag: "Includes the {chip} badge",
        viewAll: "See all pricing",
        badges: {
          free: "Free",
          freemium: "Freemium",
          "open-source": "Open source",
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
  },
} as const satisfies Partial<Record<SupportedLocale, AbstractIntlMessages>>;

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
