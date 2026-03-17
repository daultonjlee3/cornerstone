import { redirect } from "next/navigation";
import { DEMO_LOGIN_CONFIG, ROUTES } from "@/lib/marketing-site";
import { DemoEnterForm } from "./demo-enter-form";

const DEMO_SLUGS = [
  "facility-maintenance",
  "industrial",
  "school-district",
  "healthcare",
] as const;

type DemoSlug = (typeof DEMO_SLUGS)[number];

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return DEMO_SLUGS.map((slug) => ({ slug }));
}

/**
 * Public demo entry routes: no login. Show email capture and create temporary guest session,
 * then redirect into the seeded demo environment for this industry.
 */
export default async function DemoPage({ params }: Props) {
  const { slug } = await params;
  if (!DEMO_SLUGS.includes(slug as DemoSlug)) {
    redirect(ROUTES.howItWorks);
  }

  const config = DEMO_LOGIN_CONFIG[slug];
  if (!config) redirect(ROUTES.howItWorks);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12">
      <DemoEnterForm industrySlug={slug} industryLabel={config.label} />
    </div>
  );
}
