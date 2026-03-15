import type { Metadata } from "next";
import { LegalPageLayout, LegalSection } from "../components/legal-page-layout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Cornerstone OS. How we collect, use, store, and protect your information. The Operations System for Maintenance Teams.",
};

function getLastUpdated(): string {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function PrivacyPolicyPage() {
  const lastUpdated = getLastUpdated();

  return (
    <LegalPageLayout
      title="Privacy Policy"
      subtitle="Cornerstone OS"
      lastUpdated={lastUpdated}
    >
      <LegalSection title="1. Information We Collect">
        <p>We may collect:</p>
        <ul>
          <li>
            account information such as name, email, and organization details
          </li>
          <li>
            operational data entered into the platform, such as assets, work orders,
            schedules, technician details, and vendor information
          </li>
          <li>
            technical information such as browser type, device information, IP address,
            and usage data
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. How We Use Information">
        <p>We use information to:</p>
        <ul>
          <li>operate and maintain the platform</li>
          <li>authenticate users</li>
          <li>provide support</li>
          <li>improve functionality and usability</li>
          <li>analyze usage trends</li>
          <li>monitor and secure the Service</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Data Storage">
        <p>
          Customer data is stored using secure infrastructure providers and cloud services
          used to operate Cornerstone OS.
        </p>
      </LegalSection>

      <LegalSection title="4. Data Sharing">
        <p>
          We do not sell customer data. We may share data with trusted service providers
          that help us operate, host, secure, analyze, and support the Service.
        </p>
      </LegalSection>

      <LegalSection title="5. Data Retention">
        <p>
          We retain information as long as reasonably necessary to provide the Service,
          comply with legal obligations, resolve disputes, and enforce agreements.
        </p>
      </LegalSection>

      <LegalSection title="6. Security">
        <p>
          We use reasonable administrative, technical, and organizational safeguards to
          protect information, though no system can be guaranteed completely secure.
        </p>
      </LegalSection>

      <LegalSection title="7. Cookies and Tracking">
        <p>
          We may use cookies and similar technologies to support login sessions, remember
          preferences, improve performance, and understand how the platform is used.
        </p>
      </LegalSection>

      <LegalSection title="8. Third Party Services">
        <p>
          Cornerstone OS may rely on third-party providers for hosting, authentication,
          analytics, monitoring, communications, and infrastructure.
        </p>
      </LegalSection>

      <LegalSection title="9. Your Rights">
        <p>
          Depending on applicable law, users may have rights to request access, correction,
          deletion, or restriction of their personal data.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. Continued use of the
          Service after updates become effective constitutes acceptance of the revised
          policy.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact">
        <p>
          For questions about this Privacy Policy, contact:{" "}
          <a
            href="mailto:support@cornerstonecmms.com"
            className="font-medium text-[var(--accent)] hover:underline"
          >
            support@cornerstonecmms.com
          </a>
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
