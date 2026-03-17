import type { MetadataRoute } from "next";
import {
  SITE_URL,
  ROUTES,
  FEATURES,
  INDUSTRIES,
} from "@/lib/marketing-site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL;

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}${ROUTES.product}`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}${ROUTES.pricing}`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}${ROUTES.foundingCustomer}`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}${ROUTES.howItWorks}`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}${ROUTES.about}`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}${ROUTES.contact}`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/industries`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.85 },
  ];

  const featurePages: MetadataRoute.Sitemap = FEATURES.map((f) => ({
    url: `${base}${f.href}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));

  const industryPages: MetadataRoute.Sitemap = INDUSTRIES.map((i) => ({
    url: `${base}${i.href}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));

  return [...staticPages, ...featurePages, ...industryPages];
}
