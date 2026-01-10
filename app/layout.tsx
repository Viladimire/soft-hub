import type { Metadata } from "next";

import Monitoring from "@/components/Monitoring";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { firstNonEmpty, getSettings } from "@/lib/data";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const siteTitle = firstNonEmpty(settings.seo?.title, settings.siteName) ?? settings.siteName;
  const description =
    firstNonEmpty(settings.seo?.description, settings.description, settings.tagline) ??
    settings.description;
  const canonical = settings.seo?.canonical;

  return {
    title: {
      default: siteTitle,
      template: `%s | ${settings.siteName}`,
    },
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title: siteTitle,
      description,
      url: canonical,
      siteName: settings.siteName,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: siteTitle,
      description,
    },
  } satisfies Metadata;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSettings();

  return (
    <html lang="en">
      <body
        className="bg-zinc-50 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100"
      >
        <div className="flex min-h-screen flex-col">
          <Monitoring />
          <Header siteName={settings.siteName} navigation={settings.navigation ?? []} />
          <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
