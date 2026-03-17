import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/marketing-site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/portal/", "/api/", "/login", "/signup", "/onboarding", "/onboarding-wizard/", "/settings/", "/technician/", "/request/", "/requests/", "/assets/", "/work-orders/", "/buildings/", "/companies/", "/crews/", "/customers/", "/dispatch/", "/inventory/", "/preventive-maintenance/", "/products/", "/properties/", "/purchase-orders/", "/technicians/", "/units/", "/vendors/", "/platform/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
