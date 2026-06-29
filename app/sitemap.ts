import type { MetadataRoute } from "next";
import { FLEET_ROUTES } from "@/lib/fleet-marketing-site";
import { SITE_URL } from "@/lib/marketing-site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL;

  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    {
      url: `${base}${FLEET_ROUTES.integrations}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.95,
    },
    {
      url: `${base}${FLEET_ROUTES.implementation}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${base}${FLEET_ROUTES.launchEstimator}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      url: `${base}${FLEET_ROUTES.about}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}${FLEET_ROUTES.requestPilot}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${base}${FLEET_ROUTES.privacy}`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}${FLEET_ROUTES.terms}`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
