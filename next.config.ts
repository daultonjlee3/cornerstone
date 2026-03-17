import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/industries/facility-maintenance", destination: "/facility-maintenance-software", permanent: true },
      { source: "/industries/industrial-manufacturing", destination: "/industrial-maintenance-software", permanent: true },
      { source: "/industries/school-districts", destination: "/school-maintenance-software", permanent: true },
      { source: "/industries/healthcare", destination: "/healthcare-maintenance-software", permanent: true },
    ];
  },

  // Optimize barrel imports for large icon libraries so only the icons actually
  // used are included in the JS bundle instead of the entire lucide-react set.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  images: {
    // Prefer modern formats for any next/image served from the app.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
