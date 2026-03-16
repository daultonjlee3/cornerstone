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
};

export default nextConfig;
