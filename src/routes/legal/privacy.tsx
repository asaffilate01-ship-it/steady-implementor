import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/LegalLayout";
import { legalConfig } from "@/lib/legal-config";

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
    <LegalLayout title="Privacy Policy" updated="2 August 2026">
      <p>
        This Privacy Policy explains how {legalConfig.companyName} ("we") processes personal data
        when you use ParkPunkt. It must be reviewed against the final production integrations,
        sub-processors and operating procedures before launch.
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
        We retain each category only for its documented operational or statutory period and then
        delete or anonymise it. The final retention schedule, including any ANPR or enforcement
        evidence periods, will be approved and published before those features are activated.
      </p>
      <h2>Sharing</h2>
      <p>
        We share data only with operators of sites you use, our PSD2 payment processor,
        sub-processors listed in our GDPR page, and authorities where legally required.
      </p>
      <h2>Your rights</h2>
      <p>
        You have the right to access, rectify, erase, restrict, port and object to processing of
        your personal data, and to lodge a complaint with a supervisory authority. Submit a request
        to {legalConfig.privacyEmail}. Identity verification may be required before a request is
        fulfilled.
      </p>
      <h2>International transfers</h2>
      <p>
        The current sub-processor list identifies processing locations and transfer safeguards.
        Where data is transferred outside the EU/EEA, we use an applicable lawful transfer mechanism
        and assess supplementary safeguards where required.
      </p>
      <h2>Contact</h2>
      <p>
        Controller: {legalConfig.companyName}. Privacy contact: {legalConfig.privacyEmail}. Data
        protection officer/contact, where applicable: {legalConfig.dpo}.
      </p>
    </LegalLayout>
  );
}
