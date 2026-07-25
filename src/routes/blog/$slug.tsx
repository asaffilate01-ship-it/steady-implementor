import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import logoAsset from "@/assets/parkpunkt-logo.png.asset.json";
import { LangToggle, useI18n } from "@/lib/i18n";
import { SiteFooter } from "@/components/SiteFooter";
import { findPost, POSTS } from "@/lib/blog-data";
import { ShareRow } from "@/components/SocialIcons";
import { ArrowLeft, Clock } from "lucide-react";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = findPost(params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData, params }) => {
    const title = loaderData?.title.en ?? "Article";
    return {
      meta: [
        { title: `${title} — ParkPunkt Journal` },
        { name: "description", content: loaderData?.excerpt.en ?? "" },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData?.excerpt.en ?? "" },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `/blog/${params.slug}` },
        ...(loaderData?.cover
          ? [
              { property: "og:image", content: loaderData.cover },
              { name: "twitter:image", content: loaderData.cover },
              { name: "twitter:card", content: "summary_large_image" },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: `/blog/${params.slug}` }],
    };
  },
  component: PostPage,
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center text-muted-foreground">Article not found.</div>
  ),
});

function PostPage() {
  const post = Route.useLoaderData();
  const { t, lang } = useI18n();
  const url = typeof window !== "undefined" ? window.location.href : `https://parkpunkt.example/blog/${post.slug}`;
  const others = POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4 md:h-28">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoAsset.url} alt="ParkPunkt" className="h-10 w-auto md:h-26" />
          </Link>
          <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
            <LangToggle />
            <Link to="/blog" className="inline-flex items-center gap-1 hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> {t("blog.back")}
            </Link>
          </div>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-4 py-12">
        <span className="rounded-full bg-secondary/70 px-2.5 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">{post.tag}</span>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">{post.title[lang]}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>{t("blog.by")} {post.author}</span>
          <span>·</span>
          <span>{new Date(post.date).toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", { dateStyle: "long" })}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{post.minutes} {t("blog.min")}</span>
        </div>
        <img src={post.cover} alt="" className="mt-8 aspect-[16/9] w-full rounded-2xl border border-border object-cover" />
        <div className="prose prose-neutral mt-8 max-w-none text-foreground/90 [&_p]:mt-5 [&_p]:leading-relaxed">
          {post.body[lang].map((para: string, i: number) => <p key={i}>{para}</p>)}
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-6">
          <span className="text-sm text-muted-foreground">{t("blog.share")}</span>
          <ShareRow title={post.title[lang]} url={url} />
        </div>

        {others.length > 0 && (
          <div className="mt-14">
            <h2 className="text-lg font-semibold tracking-tight">{t("blog.title")}</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {others.map((p) => (
                <Link
                  key={p.slug}
                  to="/blog/$slug"
                  params={{ slug: p.slug }}
                  className="group flex gap-3 overflow-hidden rounded-2xl border border-border bg-card p-3 transition-colors hover:border-accent/50"
                >
                  <img src={p.cover} alt="" className="h-20 w-24 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{p.tag}</div>
                    <div className="mt-1 line-clamp-2 text-sm font-semibold">{p.title[lang]}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
      <SiteFooter />
    </div>
  );
}