import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/LegalLayout";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — ParkPunkt" },
      {
        name: "description",
        content: "How ParkPunkt collects, uses, retains and protects your personal data.",
      },
      { property: "og:title", content: "Privacy Policy — ParkPunkt" },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "/legal/privacy" },
    ],
    links: [{ rel: "canonical", href: "/legal/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="25 July 2026">
      <p>
        This Privacy Policy explains how ParkPunkt GmbH ("we") collects and processes personal data
        when you use the ParkPunkt platform. It is written to comply with the EU General Data
        Protection Regulation (GDPR) and the German BDSG.
      </p>
      <h2>Data we collect</h2>
      <ul>
        <li>
          <strong>Account data:</strong> name, email, hashed password, role.
        </li>
        <li>
          <strong>Vehicle data:</strong> licence plate you register.
        </li>
        <li>
          <strong>Session data:</strong> site, start / end time, tariff, amount charged.
        </li>
        <li>
          <strong>Location:</strong> approximate location only when you actively search, and only if
          you grant the permission.
        </li>
        <li>
          <strong>Device &amp; usage:</strong> IP address, device type and consented analytics.
        </li>
      </ul>
      <h2>Legal bases</h2>
      <ul>
        <li>
          Contract performance (Art. 6(1)(b) GDPR) — running your parking sessions and settling
          payment.
        </li>
        <li>Legitimate interests (Art. 6(1)(f)) — fraud prevention and security.</li>
        <li>Consent (Art. 6(1)(a)) — analytics and marketing cookies, marketing emails.</li>
        <li>Legal obligation (Art. 6(1)(c)) — tax, accounting and enforcement records.</li>
      </ul>
      <h2>Retention</h2>
      <p>
        Session records are retained for the statutory period (6–10 years for tax purposes). ANPR
        captures without a matching session are deleted within 24 hours. You can request deletion of
        non-statutory data at any time.
      </p>
      <h2>Sharing</h2>
      <p>
        We share data only with operators of sites you use, our PSD2 payment processor,
        sub-processors listed in our GDPR page, and authorities where legally required.
      </p>
      <h2>Your rights</h2>
      <p>
        You have the right to access, rectify, erase, restrict, port and object to processing of
        your personal data, and to lodge a complaint with a supervisory authority. Contact
        privacy@parkpunkt.example or use the export/delete tools in the driver app.
      </p>
      <h2>International transfers</h2>
      <p>
        Data is hosted in the EU. Any transfer outside the EU/EEA uses Standard Contractual Clauses.
      </p>
      <h2>Contact</h2>
      <p>Data Protection Officer: dpo@parkpunkt.example.</p>
    </LegalLayout>
  );
}
