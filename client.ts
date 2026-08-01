import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/LegalLayout";
import { legalConfig } from "@/lib/legal-config";

export const Route = createFileRoute("/legal/complaints")({
  head: () => ({
    meta: [
      { title: "Complaints — ParkPunkt" },
      {
        name: "description",
        content:
          "How to raise a complaint about a ParkPunkt session, charge, or operator interaction.",
      },
      { property: "og:title", content: "Complaints — ParkPunkt" },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "/legal/complaints" },
    ],
    links: [{ rel: "canonical", href: "/legal/complaints" }],
  }),
  component: ComplaintsPage,
});

function ComplaintsPage() {
  return (
    <LegalLayout title="Complaints" updated="1 August 2026">
      <p>
        We want ParkPunkt to work every time you use it. When it doesn't, this is how to tell us —
        and what to expect back.
      </p>
      <h2>How to file</h2>
      <ol className="mt-3 list-decimal space-y-1 pl-6">
        <li>Email {legalConfig.complaintsEmail} with your session ID and a short description.</li>
        <li>
          Include supporting photographs or receipts where relevant, but do not send full card
          details.
        </li>
        <li>For enforcement notices, use the dispute link on the notice itself.</li>
      </ol>
      <h2>Our commitment</h2>
      <ul>
        <li>We will acknowledge the complaint and provide a target response date.</li>
        <li>If we need more time, we will explain why and when to expect the outcome.</li>
      </ul>
      <h2>Escalation</h2>
      <p>If you're not satisfied with our response you can escalate to:</p>
      <ul>
        <li>The operator of the site (contact details on your receipt).</li>
        <li>Your local consumer protection authority.</li>
        <li>For payment disputes, your card issuer under PSD2.</li>
        <li>For data-protection issues, your regional supervisory authority.</li>
      </ul>
      <h2>Consumer dispute resolution</h2>
      <p>{legalConfig.adrStatement}</p>
    </LegalLayout>
  );
}
