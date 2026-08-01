import { createFileRoute, Link } from "@tanstack/react-router";
import logoAsset from "@/assets/parkpunkt-logo.png.asset.json";
import { LangToggle, useI18n } from "@/lib/i18n";
import { SiteFooter } from "@/components/SiteFooter";
import { POSTS } from "@/lib/blog-data";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Journal — ParkPunkt" },
      {
        name: "description",
        content:
          "Product notes, engineering deep dives, and city-mobility research from the ParkPunkt team.",
      },
      { property: "og:title", content: "Journal — ParkPunkt" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/blog" },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const { t, lang } = useI18n();
  const [featured, ...rest] = POSTS;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 md:h-28">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoAsset.url} alt="ParkPunkt" className="h-10 w-auto md:h-26" />
          </Link>
          <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
            <LangToggle />
            <Link to="/" className="inline-flex items-center gap-1 hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> {t("common.back")}
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">{t("blog.title")}</h1>
          <p className="mt-3 text-muted-foreground">{t("blog.sub")}</p>
        </div>

        <Link
          to="/blog/$slug"
          params={{ slug: featured.slug }}
          className="mt-10 grid gap-6 overflow-hidden rounded-3xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)] md:grid-cols-2"
        >
          <img
            src={featured.cover}
            alt=""
            className="aspect-[4/3] h-full w-full object-cover md:aspect-auto"
            loading="lazy"
          />
          <div className="flex flex-col justify-center p-6 md:p-10">
            <span className="w-fit rounded-full bg-secondary/70 px-2.5 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
              {featured.tag}
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
              {featured.title[lang]}
            </h2>
            <p className="mt-3 text-muted-foreground">{featured.excerpt[lang]}</p>
            <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {t("blog.by")} {featured.author}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {featured.minutes} {t("blog.min")}
              </span>
            </div>
            <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
              {t("blog.read")} <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </Link>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {rest.map((p) => (
            <Link
              key={p.slug}
              to="/blog/$slug"
              params={{ slug: p.slug }}
              className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-accent/50 hover:shadow-[var(--shadow-soft)]"
            >
              <div className="aspect-[16/9] overflow-hidden">
                <img
                  src={p.cover}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="p-5">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {p.tag}
                </span>
                <h3 className="mt-2 text-lg font-semibold tracking-tight">{p.title[lang]}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.excerpt[lang]}</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{p.author}</span>
                  <span>·</span>
                  <span>
                    {p.minutes} {t("blog.min")}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
