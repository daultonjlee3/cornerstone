import type { Metadata } from "next";
import {
  INDUSTRIES,
  SEO_INDUSTRIES,
  buildMarketingMetadata,
  type IndustrySlug,
} from "@/lib/marketing-site";
import { IndustryPageContent } from "@/app/components/marketing/industry-page-content";

const SLUG: IndustrySlug = "industrial-maintenance-software";
const industry = INDUSTRIES.find((i) => i.slug === SLUG)!;
const seo = SEO_INDUSTRIES[SLUG];

export const metadata: Metadata = buildMarketingMetadata(
  seo.title,
  seo.description,
  industry.href
);

export default function IndustrialMaintenanceSoftwarePage() {
  return <IndustryPageContent industrySlug={SLUG} />;
}
