import { notFound } from "next/navigation";
import { HelpGuideView } from "@/components/help-center";
import { getGuide, HELP_GUIDES } from "@/lib/help-guides";
import { requireTenant } from "@/lib/tenant";

export function generateStaticParams() {
  return HELP_GUIDES.map((g) => ({ slug: g.slug }));
}

export default async function HelpGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireTenant();
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();
  return <HelpGuideView guide={guide} />;
}
