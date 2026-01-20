import { redirect } from "next/navigation";

type PageProps = {
  params: { locale: string };
};

export default async function TrendsAliasRedirect({ params }: PageProps) {
  const { locale } = params;
  redirect(`/${locale}/insights/trends`);
}
