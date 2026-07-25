import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/LegalLayout";

export const Route = createFileRoute("/legal/gdpr")({
  head: () => ({
    meta: [
      { title: "GDPR — ParkPunkt" },
      { name: "description", content: "How ParkPunkt implements the GDPR: legal bases, sub-processors, DPO contact and data-subject rights." },
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
    <LegalLayout title="GDPR" updated="25 July 2026">
      <p>This page is maintained by ParkPunkt GmbH to answer common data-protection questions about ParkPunkt. It is app-owned content and is not an independent certification.</p>
      <h2>Controller and DPO</h2>
      <p>Controller: ParkPunkt GmbH. Data Protection Officer: dpo@parkpunkt.example.</p>
      <h2>Data-subject rights</h2>
      <ul>
        <li>Access — request a copy of the personal data we hold about you.</li>
        <li>Rectification — correct inaccurate data.</li>
        <li>Erasure — delete data we no longer need to keep.</li>
        <li>Restriction and objection — limit or object to specific processing.</li>
        <li>Portability — receive your data in a structured, machine-readable format.</li>
        <li>Complaint — lodge a complaint with a supervisory authority (in Germany, your regional Landesdatenschutzbeauftragte).</li>
      </ul>
      <p>Submit requests to privacy@parkpunkt.example. We respond within one month.</p>
      <h2>Sub-processors</h2>
      <ul>
        <li>Cloud hosting — EU region.</li>
        <li>PSD2 payment processor — EU.</li>
        <li>Transactional email provider — EU.</li>
        <li>Error monitoring — EU.</li>
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
      <p>ParkPunkt processes personal data inside the EU/EEA. Any onward transfer uses the European Commission's Standard Contractual Clauses.</p>
      <h2>Data breach</h2>
      <p>We notify the supervisory authority within 72 hours of becoming aware of a reportable breach, and affected users without undue delay where legally required.</p>
    </LegalLayout>
  );
}