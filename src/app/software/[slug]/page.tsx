import { redirect } from "next/navigation";

import { defaultLocale } from "@/i18n/locales";

export default async function SoftwareDetailLegacyRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/${defaultLocale}/software/${slug}`);
}
