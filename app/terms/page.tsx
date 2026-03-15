import { LegalPageLayout, LegalSection } from "../components/legal-page-layout";

export const metadata = {
  title: "Terms of Service | Cornerstone OS",
  description:
    "Terms of Service for Cornerstone OS — The Operations System for Maintenance Teams",
};

function getLastUpdated(): string {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function TermsOfServicePage() {
  const lastUpdated = getLastUpdated();

  return (
    <LegalPageLayout
      title="Terms of Service"
      subtitle="Cornerstone OS"
      lastUpdated={lastUpdated}
    >
      <LegalSection title="1. Description of Service">
        <p>
          Cornerstone OS provides a cloud-based maintenance and operations management platform
          that helps organizations manage assets, work orders, technicians, preventive maintenance
          schedules, vendors, and operational workflows.
        </p>
      </LegalSection>

      <LegalSection title="2. Eligibility">
        <p>
          Users must be at least 18 years old and have authority to use the Service on behalf of
          themselves or their organization.
        </p>
      </LegalSection>

      <LegalSection title="3. Accounts">
        <p>
          Users are responsible for maintaining account security, providing accurate account
          information, and all activity occurring under their account.
        </p>
      </LegalSection>

      <LegalSection title="4. Acceptable Use">
        <p>Users may not:</p>
        <ul>
          <li>violate laws or regulations</li>
          <li>interfere with the Service</li>
          <li>attempt unauthorized access</li>
          <li>distribute malicious code</li>
          <li>misuse the platform in ways that harm the Company or other users</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Customer Data">
        <p>
          Customers retain ownership of the data they input into the platform. Cornerstone OS may
          store, process, and transmit customer data solely to provide, secure, maintain, and
          improve the Service.
        </p>
      </LegalSection>

      <LegalSection title="6. Service Availability">
        <p>
          We strive to provide reliable service but do not guarantee uninterrupted availability.
          Maintenance, updates, outages, and third-party service interruptions may affect access.
        </p>
      </LegalSection>

      <LegalSection title="7. Payments and Subscriptions">
        <p>
          If paid plans are offered, subscription fees, billing periods, renewals, and non-payment
          rules apply according to the selected plan.
        </p>
      </LegalSection>

      <LegalSection title="8. Intellectual Property">
        <p>
          All software, branding, interface design, and underlying technology related to
          Cornerstone OS remain the property of Cornerstone OS or its licensors.
        </p>
      </LegalSection>

      <LegalSection title="9. Termination">
        <p>
          Users may stop using the Service at any time. We may suspend or terminate access if
          these Terms are violated or if necessary to protect the Service.
        </p>
      </LegalSection>

      <LegalSection title="10. Disclaimer of Warranties">
        <p>
          The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis
          without warranties of any kind, to the maximum extent permitted by law.
        </p>
      </LegalSection>

      <LegalSection title="11. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, Cornerstone OS will not be liable for indirect,
          incidental, special, consequential, or punitive damages arising from use of the Service.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes to Terms">
        <p>
          We may update these Terms from time to time. Continued use of the Service after
          changes become effective constitutes acceptance of the revised Terms.
        </p>
      </LegalSection>

      <LegalSection title="13. Contact">
        <p>
          For questions about these Terms, contact:{" "}
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
