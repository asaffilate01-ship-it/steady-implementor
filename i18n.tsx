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
    <LegalLayout title="Privacy Policy" updated="1 August 2026">
      <p>
        This Privacy Policy explains how {legalConfig.companyName} ("we") collects and processes
        personal data when you use the ParkPunkt platform.
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
          <strong>Technical data:</strong> IP address and request/security logs required to operate
          and protect the service.
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
        Transaction records are retained for applicable tax and accounting periods. Operational,
        location and security data is kept only for a documented business or legal purpose and then
        deleted or anonymised.
      </p>
      <h2>Sharing</h2>
      <p>
        We share data only with the parking operator involved in your session, contracted service
        providers needed to deliver the service, payment providers when payment processing is
        enabled, and authorities where legally required.
      </p>
      <h2>Your rights</h2>
      <p>
        You have the right to access, rectify, erase, restrict, port and object to processing of
        your personal data, and to lodge a complaint with a supervisory authority. Contact{" "}
        {legalConfig.privacyEmail}.
      </p>
      <h2>International transfers</h2>
      <p>
        Hosting regions, sub-processors and any applicable transfer safeguards must be listed in the
        production sub-processor register.
      </p>
      <h2>Contact</h2>
      <p>Privacy contact / Data Protection Officer: {legalConfig.dpo}.</p>
    </LegalLayout>
  );
}
