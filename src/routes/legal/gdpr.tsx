import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/LegalLayout";
import { legalConfig } from "@/lib/legal-config";

export const Route = createFileRoute("/legal/gdpr")({
  head: () => ({
    meta: [
      { title: "GDPR — ParkPunkt" },
      {
        name: "description",
        content:
          "How ParkPunkt implements the GDPR: legal bases, sub-processors, DPO contact and data-subject rights.",
      },
      { property: "og:title", content: "GDPR — ParkPunkt" },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "/legal/gdpr" },
    ],
    links: [{ rel: "canonical", href: "/legal/gdpr" }],
  }),
  component: GdprPage,
});

function GdprPage() {
  return (
    <LegalLayout title="GDPR" updated="2 August 2026">
      <p>
        This page is maintained by {legalConfig.companyName} to answer data-protection questions
        about ParkPunkt. It is app-owned content and is not an independent certification.
      </p>
      <h2>Controller and DPO</h2>
      <p>
        Controller: {legalConfig.companyName}. Privacy contact: {legalConfig.privacyEmail}. Data
        protection officer/contact, where applicable: {legalConfig.dpo}.
      </p>
      <h2>Data-subject rights</h2>
      <ul>
        <li>Access — request a copy of the personal data we hold about you.</li>
        <li>Rectification — correct inaccurate data.</li>
        <li>Erasure — delete data we no longer need to keep.</li>
        <li>Restriction and objection — limit or object to specific processing.</li>
        <li>Portability — receive your data in a structured, machine-readable format.</li>
        <li>
          Complaint — lodge a complaint with a supervisory authority (in Germany, your regional
          Landesdatenschutzbeauftragte).
        </li>
      </ul>
      <p>
        Submit requests to {legalConfig.privacyEmail}. We respond within the period required by
        applicable data-protection law and will explain any lawful extension.
      </p>
      <h2>Sub-processors</h2>
      <ul>
        <li>Cloud hosting and database providers.</li>
        <li>Payment processing providers.</li>
        <li>Transactional communications providers.</li>
        <li>Security and error-monitoring providers.</li>
      </ul>
      <p>A full, current list is available on request.</p>
      <h2>Security</h2>
      <ul>
        <li>Row-level security on all customer-facing tables.</li>
        <li>Role-based access control with least-privilege defaults.</li>
        <li>Encryption in transit (TLS 1.2+) and at rest.</li>
        <li>Audit trails on session, tariff and enforcement changes.</li>
      </ul>
      <h2>International transfers</h2>
      <p>
        Processing locations and transfer safeguards are recorded in the current sub-processor
        register. Appropriate transfer mechanisms are used where processing occurs outside the
        EU/EEA.
      </p>
      <h2>Data breach</h2>
      <p>
        We notify the supervisory authority within 72 hours of becoming aware of a reportable
        breach, and affected users without undue delay where legally required.
      </p>
    </LegalLayout>
  );
}
