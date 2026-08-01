import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/LegalLayout";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — ParkPunkt" },
      {
        name: "description",
        content:
          "The terms that govern use of ParkPunkt's driver app, operator, provider and enforcement services.",
      },
      { property: "og:title", content: "Terms of Service — ParkPunkt" },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "/legal/terms" },
    ],
    links: [{ rel: "canonical", href: "/legal/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="25 July 2026">
      <p>
        These Terms of Service ("Terms") govern your access to and use of ParkPunkt, a parking
        discovery, session and payment platform ("the Service") operated by ParkPunkt GmbH
        ("ParkPunkt", "we", "us").
      </p>
      <h2>1. Acceptance</h2>
      <p>
        By creating an account, starting a session or otherwise using the Service, you agree to be
        bound by these Terms and the accompanying Privacy Policy.
      </p>
      <h2>2. Eligibility</h2>
      <p>
        You must be at least 18 years old and legally able to enter into a binding contract in your
        jurisdiction. Driver accounts are for personal use; operator, provider and enforcement
        accounts are for verified organisations.
      </p>
      <h2>3. Parking sessions</h2>
      <ul>
        <li>
          A session begins when you confirm start and ends when you tap end, when a barrier-less
          venue's ANPR system records exit, or when your maximum duration is reached.
        </li>
        <li>Tariffs are set by the operator of the site and displayed before you confirm.</li>
        <li>Compliance with local traffic and parking rules remains your responsibility.</li>
      </ul>
      <h2>4. Payments</h2>
      <p>
        All payments are processed through PSD2-compliant providers. Amounts are charged to the
        payment method you selected. Refunds follow the operator's refund policy plus your statutory
        rights.
      </p>
      <h2>5. Acceptable use</h2>
      <p>
        You may not misuse the Service — including but not limited to attempting to circumvent
        tariffs, spoofing plates, scraping the API without a written agreement, or interfering with
        security controls.
      </p>
      <h2>6. Suspension and termination</h2>
      <p>
        We may suspend or terminate accounts that violate these Terms, engage in fraud, or
        repeatedly fail to pay. You may close your account at any time from the driver app.
      </p>
      <h2>7. Liability</h2>
      <p>
        To the extent permitted by law, ParkPunkt is not liable for indirect or consequential
        damages. Nothing in these Terms excludes liability for gross negligence or intent, or your
        statutory consumer rights.
      </p>
      <h2>8. Governing law</h2>
      <p>
        These Terms are governed by the laws of the Federal Republic of Germany. Exclusive venue is
        Berlin, unless a mandatory consumer forum applies.
      </p>
      <h2>9. Changes</h2>
      <p>
        We will notify you of material changes at least 30 days before they take effect. Continued
        use after the effective date constitutes acceptance.
      </p>
      <h2>10. Contact</h2>
      <p>Questions about these Terms: legal@parkpunkt.example.</p>
    </LegalLayout>
  );
}
