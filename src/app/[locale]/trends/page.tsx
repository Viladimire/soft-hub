import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function TrendsAliasRedirect({ params }: PageProps) {
  const { locale } = await params;
  redirect(`/${locale}/insights/trends`);
}
