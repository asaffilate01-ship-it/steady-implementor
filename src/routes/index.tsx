import { createFileRoute, Link } from "@tanstack/react-router";
import logoAsset from "@/assets/parkpunkt-logo.png.asset.json";
import heroAsset from "@/assets/pp-hero.jpg.asset.json";
import iconFind from "@/assets/pp-icon-find.png.asset.json";
import iconPark from "@/assets/pp-icon-park.png.asset.json";
import iconPay from "@/assets/pp-icon-pay.png.asset.json";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useAuth";
import { LangToggle, useI18n } from "@/lib/i18n";
import {
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
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 md:h-28">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoAsset.url} alt="ParkPunkt" className="h-10 w-auto md:h-24" />
        </Link>
        <nav className="ml-6 hidden gap-6 text-sm text-muted-foreground md:flex">
          <a href="#stakeholders" className="hover:text-foreground">For whom</a>
          <a href="#how" className="hover:text-foreground">How it works</a>
          <a href="#features" className="hover:text-foreground">Platform</a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LangToggle />
          <Button asChild variant="ghost" size="sm">
            <Link to="/drive">{t("nav.driver")}</Link>
          </Button>
          {signedIn ? (
            <Button asChild size="sm">
              <Link to="/operator">{t("nav.workspace")}</Link>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">{t("nav.signin")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero({ signedIn }: { signedIn: boolean }) {
  const { t } = useI18n();
  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(60% 50% at 20% 10%, color-mix(in oklch, var(--primary) 22%, transparent), transparent), radial-gradient(50% 40% at 90% 20%, color-mix(in oklch, var(--accent) 22%, transparent), transparent)",
        }}
      />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-2 md:py-24">
        <div className="flex flex-col justify-center">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" /> {t("home.badge")}
          </span>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
            {t("home.title.1")}{" "}
            <span className="bg-gradient-to-r from-accent to-[oklch(0.72_0.17_148)] bg-clip-text text-transparent">
              {t("home.title.2")}
            </span>
          </h1>
          <p className="mt-4 max-w-lg text-base text-muted-foreground md:text-lg">
            {t("home.subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="shadow-[var(--shadow-elegant)]">
              <Link to="/drive">
                {t("home.cta.driver")} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to={signedIn ? "/operator" : "/auth"}>
                {signedIn ? t("nav.workspace") : t("home.cta.signin")}
              </Link>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap gap-6 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-accent" />{t("home.badge.anpr")}</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-accent" />{t("home.badge.psd2")}</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-accent" />{t("home.badge.gdpr")}</span>
          </div>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}

function HeroVisual() {
  const { t } = useI18n();
  return (
    <div className="relative flex items-center justify-center">
      <div className="absolute -inset-8 -z-10 rounded-[3rem] opacity-40 blur-3xl" style={{ background: "var(--gradient-hero)" }} />
      <div className="relative w-full overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-elegant)]">
        <img
          src={heroAsset.url}
          alt="ParkPunkt smart garage with ANPR entry"
          className="aspect-[4/3] w-full object-cover"
          width={1600}
          height={1200}
        />
        <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-black/55 p-3 text-white shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-white/70">
            <span>{t("session.active")}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/25 px-2 py-0.5 text-accent">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              {t("session.live")}
            </span>
          </div>
          <div className="mt-1 flex items-end justify-between">
            <div>
              <div className="text-3xl font-semibold tabular-nums">42 min</div>
              <div className="text-[11px] text-white/60">Contipark · Alexanderplatz</div>
            </div>
            <div className="text-right text-[11px] text-white/60">
              <div className="font-mono text-white">B-PP 2026</div>
              <div>€3.50/h · €2.45</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stakeholders() {
  const { t } = useI18n();
  const items = [
    { icon: Car, key: "driver", href: "/drive", tint: "from-[oklch(0.72_0.17_148)] to-[oklch(0.55_0.14_160)]" },
    { icon: Building2, key: "operator", href: "/operator", tint: "from-[oklch(0.62_0.17_255)] to-[oklch(0.42_0.14_260)]" },
    { icon: Radar, key: "enforce", href: "/enforcement", tint: "from-[oklch(0.72_0.17_35)] to-[oklch(0.52_0.16_25)]" },
    { icon: BarChart3, key: "provider", href: "/provider", tint: "from-[oklch(0.72_0.15_300)] to-[oklch(0.48_0.16_290)]" },
  ] as const;
  return (
    <section id="stakeholders" className="border-t border-border/60 bg-secondary/40 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("home.stake.title")}</h2>
          <p className="mt-3 text-muted-foreground">{t("home.stake.sub")}</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {items.map((s, i) => (
            <div key={s.key} className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-accent/60 hover:shadow-[var(--shadow-elegant)]">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-60" style={{ background: "var(--gradient-brand)" }} />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative">
                <div className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${s.tint} text-white shadow-lg shadow-primary/25 ring-1 ring-white/20 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3`}>
                  <s.icon className="h-7 w-7 drop-shadow" />
                </div>
                <span className="absolute -right-1 -top-2 rounded-full bg-background/80 px-2 py-0.5 font-mono text-[10px] tracking-widest text-muted-foreground ring-1 ring-border">0{i + 1}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{t(`home.stake.${s.key}.title` as never)}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{t(`home.stake.${s.key}.body` as never)}</p>
              <Link to={s.href} className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-all group-hover:gap-2.5">
                {t(`home.stake.${s.key}.cta` as never)} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const { t } = useI18n();
  const steps = [
    { img: iconFind.url, key: "find" },
    { img: iconPark.url, key: "park" },
    { img: iconPay.url, key: "pay" },
  ] as const;
  return (
    <section id="how" className="py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("home.how.title")}</h2>
          <p className="mt-3 text-muted-foreground">{t("home.how.sub")}</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.key} className="group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-card to-secondary/40 p-6 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]">
              <div className="flex items-start justify-between">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">{t("home.how.step")} {i + 1}</span>
                <div className="text-3xl font-semibold text-primary/15 tabular-nums">0{i + 1}</div>
              </div>
              <div className="my-3 flex justify-center">
                <img src={s.img} alt="" className="h-32 w-32 object-contain drop-shadow-2xl transition-transform group-hover:scale-110" loading="lazy" width={512} height={512} />
              </div>
              <h3 className="text-lg font-semibold">{t(`home.how.${s.key}.title` as never)}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t(`home.how.${s.key}.body` as never)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  { icon: Radar, title: "ANPR & barrier control", body: "Plate-in / plate-out events wire directly into sessions and enforcement.", tint: "from-[oklch(0.72_0.17_148)] to-[oklch(0.5_0.14_160)]" },
  { icon: CreditCard, title: "Payment orchestration", body: "External wallets or marketplace settlement — pick the route per operator.", tint: "from-[oklch(0.68_0.16_220)] to-[oklch(0.42_0.14_260)]" },
  { icon: ShieldCheck, title: "GDPR by design", body: "Role-based access, RLS, and full audit trails for every session and grant.", tint: "from-[oklch(0.72_0.15_170)] to-[oklch(0.48_0.13_195)]" },
  { icon: BarChart3, title: "Operator analytics", body: "Live occupancy, tariff performance, and GMV across every site.", tint: "from-[oklch(0.72_0.15_300)] to-[oklch(0.48_0.16_290)]" },
  { icon: Building2, title: "Multi-tenant orgs", body: "Operators and providers stay isolated with per-org data and permissions.", tint: "from-[oklch(0.7_0.14_50)] to-[oklch(0.5_0.14_35)]" },
  { icon: Zap, title: "Provider API", body: "Standard REST orchestration for quote, book, extend and end operations.", tint: "from-[oklch(0.78_0.16_90)] to-[oklch(0.55_0.14_70)]" },
];

function Features() {
  const { t } = useI18n();
  return (
    <section id="features" className="border-t border-border/60 bg-secondary/40 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("home.feat.title")}</h2>
          <p className="mt-3 text-muted-foreground">{t("home.feat.sub")}</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[var(--shadow-elegant)]">
              <div className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${f.tint} opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-30`} />
              <div className="relative flex items-start gap-4">
                <div className={`relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${f.tint} text-white shadow-lg ring-1 ring-white/20 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}>
                  <f.icon className="h-6 w-6 drop-shadow" />
                  <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent to-white/25" />
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="text-base font-semibold tracking-tight">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA({ signedIn }: { signedIn: boolean }) {
  const { t } = useI18n();
  return (
    <section className="py-20">
      <div className="mx-auto max-w-5xl px-4">
        <div className="relative overflow-hidden rounded-3xl border border-border p-10 text-center text-white shadow-[var(--shadow-elegant)] md:p-14" style={{ background: "var(--gradient-hero)" }}>
          <div className="pointer-events-none absolute inset-0 opacity-30" style={{ background: "radial-gradient(60% 50% at 50% 0%, white, transparent)" }} />
          <h2 className="relative text-3xl font-semibold tracking-tight md:text-4xl">{t("home.cta.final.title")}</h2>
          <p className="relative mt-3 text-white/85">{t("home.cta.final.sub")}</p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link to="/drive">{t("home.cta.final.open")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Link to={signedIn ? "/operator" : "/auth"}>{signedIn ? t("home.cta.final.go") : t("nav.signin")}</Link>
            </Button>
          </div>
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
          <img src={logoAsset.url} alt="ParkPunkt" className="h-16 w-auto" />
          <span>© {new Date().getFullYear()} ParkPunkt · Finden. Parken. Bezahlen.</span>
        </div>
        <div className="flex gap-4">
          <Link to="/drive" className="hover:text-foreground">Driver</Link>
          <Link to="/auth" className="hover:text-foreground">Sign in</Link>
        </div>
      </div>
    </footer>
  );
}