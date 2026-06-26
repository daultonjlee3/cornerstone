import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { FLEET_SITE_NAME, FLEET_SEO, FLEET_TAGLINE } from "@/lib/fleet-marketing-site";
import { SITE_URL } from "@/lib/marketing-site";
import { AuthHashHandler } from "./components/auth-hash-handler";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const defaultTitle = FLEET_SEO.home.title;
const defaultDescription = FLEET_SEO.home.description;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: defaultTitle,
    template: `%s | ${FLEET_SITE_NAME}`,
  },
  description: defaultDescription,
  openGraph: {
    siteName: FLEET_SITE_NAME,
    type: "website",
    locale: "en_US",
    title: defaultTitle,
    description: defaultDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: FLEET_SITE_NAME,
  description: FLEET_TAGLINE,
  url: SITE_URL,
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: FLEET_SITE_NAME,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: defaultDescription,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
      >
        <AuthHashHandler />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(softwareSchema),
          }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
