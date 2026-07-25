import { createFileRoute, Link } from "@tanstack/react-router";
import logoAsset from "@/assets/parkpunkt-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useAuth";
import {
  MapPin,
  Zap,
  CreditCard,
  ShieldCheck,
  Building2,
  Car,
  Radar,
  BarChart3,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ParkPunkt — Finden. Parken. Bezahlen." },
      {
        name: "description",
        content:
          "ParkPunkt is the parking OS for drivers, operators, cities and providers. Find a spot, book instantly, and pay contactless — all on one platform.",
      },
      { property: "og:title", content: "ParkPunkt — Finden. Parken. Bezahlen." },
      {
        property: "og:description",
        content: "The parking OS for drivers, operators, cities and providers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user } = useSession();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingHeader signedIn={!!user} />
      <Hero signedIn={!!user} />
      <Stakeholders />
      <HowItWorks />
      <Features />
      <CTA signedIn={!!user} />
      <Footer />
    </div>
  );
}

function MarketingHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoAsset.url} alt="ParkPunkt" className="h-9 w-auto" />
        </Link>
        <nav className="ml-6 hidden gap-6 text-sm text-muted-foreground md:flex">
          <a href="#stakeholders" className="hover:text-foreground">For whom</a>
          <a href="#how" className="hover:text-foreground">How it works</a>
          <a href="#features" className="hover:text-foreground">Platform</a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/drive">Driver app</Link>
          </Button>
          {signedIn ? (
            <Button asChild size="sm">
              <Link to="/operator">Open workspace</Link>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(60% 50% at 20% 10%, color-mix(in oklch, var(--primary) 22%, transparent), transparent), radial-gradient(50% 40% at 90% 20%, color-mix(in oklch, var(--accent) 22%, transparent), transparent)",
        }}
      />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-2 md:py-28">
        <div className="flex flex-col justify-center">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Parking OS
          </span>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
            Finden. Parken. <span className="text-accent">Bezahlen.</span>
          </h1>
          <p className="mt-4 max-w-lg text-base text-muted-foreground md:text-lg">
            One platform connecting drivers, operators, cities and providers. Search a
            spot, start a session, and settle the fare — contactless, in seconds.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/drive">
                Try the driver app <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to={signedIn ? "/operator" : "/auth"}>
                {signedIn ? "Open workspace" : "Sign in for operators"}
              </Link>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap gap-6 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-accent" /> ANPR-ready
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-accent" /> PSD2 compliant
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-accent" /> GDPR by design
            </span>
          </div>
        </div>
        <div className="relative flex items-center justify-center">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-4 shadow-2xl">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Active session</span>
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-accent">LIVE</span>
            </div>
            <div className="mt-3 rounded-2xl bg-primary/5 p-5 text-center">
              <div className="text-xs uppercase text-muted-foreground">Time remaining</div>
              <div className="mt-1 text-5xl font-semibold tabular-nums">42 min</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Contipark · Alexanderplatz
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-md bg-secondary p-2">
                <div className="text-muted-foreground">Plate</div>
                <div className="font-mono font-medium">B-PP 2026</div>
              </div>
              <div className="rounded-md bg-secondary p-2">
                <div className="text-muted-foreground">Rate</div>
                <div className="font-medium">€3.50/h</div>
              </div>
              <div className="rounded-md bg-secondary p-2">
                <div className="text-muted-foreground">Charged</div>
                <div className="font-medium">€2.45</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const STAKEHOLDERS = [
  {
    icon: Car,
    title: "Drivers",
    body: "Find nearby spots, start a session in one tap, extend or end from your phone.",
    href: "/drive",
    cta: "Open driver app",
  },
  {
    icon: Building2,
    title: "Operators",
    body: "Manage sites, tariffs and occupancy in real time. Track revenue and utilisation.",
    href: "/operator",
    cta: "Operator dashboard",
  },
  {
    icon: Radar,
    title: "Enforcement",
    body: "ANPR-driven verification — scan a plate, see the session status, issue a notice.",
    href: "/enforcement",
    cta: "Enforcement tools",
  },
  {
    icon: BarChart3,
    title: "Providers",
    body: "Plug into the orchestration API to quote, book and settle across the network.",
    href: "/provider",
    cta: "Provider hub",
  },
];

function Stakeholders() {
  return (
    <section id="stakeholders" className="border-t border-border/60 bg-secondary/40 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            One platform, every role
          </h2>
          <p className="mt-3 text-muted-foreground">
            ParkPunkt unifies the parking value chain — from the driver at the kerb to
            the operator, the enforcement officer and the mobility provider.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STAKEHOLDERS.map((s) => (
            <div
              key={s.title}
              className="flex flex-col rounded-2xl border border-border bg-card p-6"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{s.body}</p>
              <Link
                to={s.href}
                className="mt-4 inline-flex items-center text-sm font-medium text-accent hover:underline"
              >
                {s.cta} <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { icon: MapPin, title: "Find", body: "Search by address or POI. See live availability, rates and distance." },
  { icon: Zap, title: "Park", body: "Book a slot instantly. ANPR opens the barrier — no ticket, no app juggling." },
  { icon: CreditCard, title: "Pay", body: "Charged only for the time used. Receipts land in your account automatically." },
];

function HowItWorks() {
  return (
    <section id="how" className="py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            How it works
          </h2>
          <p className="mt-3 text-muted-foreground">
            Three steps for the driver. Everything else — pricing, entitlements,
            settlement — is handled by the orchestration layer.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent/15 text-accent">
                  <s.icon className="h-5 w-5" />
                </div>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Step {i + 1}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  { icon: Radar, title: "ANPR & barrier control", body: "Plate-in / plate-out events wire directly into sessions and enforcement." },
  { icon: CreditCard, title: "Payment orchestration", body: "External wallets or marketplace settlement — pick the route per operator." },
  { icon: ShieldCheck, title: "GDPR by design", body: "Role-based access, RLS, and full audit trails for every session and grant." },
  { icon: BarChart3, title: "Operator analytics", body: "Live occupancy, tariff performance, and GMV across every site." },
  { icon: Building2, title: "Multi-tenant orgs", body: "Operators and providers stay isolated with per-org data and permissions." },
  { icon: Zap, title: "Provider API", body: "Standard REST orchestration for quote, book, extend and end operations." },
];

function Features() {
  return (
    <section id="features" className="border-t border-border/60 bg-secondary/40 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Built for the whole parking stack
          </h2>
          <p className="mt-3 text-muted-foreground">
            From the phone at the kerb to the settlement engine — every layer is
            integrated, observable and compliant.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Ready to run parking on ParkPunkt?
        </h2>
        <p className="mt-3 text-muted-foreground">
          Drivers can start now. Operators, providers and enforcement teams get access
          after signing in.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/drive">Open driver app</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to={signedIn ? "/operator" : "/auth"}>
              {signedIn ? "Go to workspace" : "Sign in"}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground md:flex-row">
        <div className="flex items-center gap-2">
          <img src={logoAsset.url} alt="ParkPunkt" className="h-6 w-auto" />
          <span>© {new Date().getFullYear()} ParkPunkt</span>
        </div>
        <div className="flex gap-4">
          <Link to="/drive" className="hover:text-foreground">Driver</Link>
          <Link to="/auth" className="hover:text-foreground">Sign in</Link>
        </div>
      </div>
    </footer>
  );
}