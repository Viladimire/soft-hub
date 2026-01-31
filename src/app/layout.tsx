import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";

import { GalaxySky } from "@/components/backgrounds/galaxy-sky";
import { OrbitBackground } from "@/components/backgrounds/orbit-background";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SOFT-HUB",
    template: "%s | SOFT-HUB",
  },
  description:
    "SOFT-HUB is a global platform for discovering, evaluating, and downloading professional software across platforms.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] antialiased`}
        suppressHydrationWarning
      >
        <GalaxySky />
        <OrbitBackground enabled={false} />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
