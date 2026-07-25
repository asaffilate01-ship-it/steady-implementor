import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import logoAsset from "@/assets/parkpunkt-logo.png.asset.json";
import { cn } from "@/lib/utils";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useSession, useMyRoles, hasRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Car, Building2, Radio, Radar, ShieldCheck, Menu, X, Home, BookOpen, type LucideIcon } from "lucide-react";
import type { AppRole } from "@/lib/auth.functions";
import { LangToggle, useI18n } from "@/lib/i18n";

type NavItem = { to: string; labelKey: string; roles?: AppRole[]; icon: LucideIcon };
const NAV: NavItem[] = [
  { to: "/drive", labelKey: "nav.driver", icon: Car },
  { to: "/operator", labelKey: "nav.operator", roles: ["operator", "admin"], icon: Building2 },
  { to: "/provider", labelKey: "nav.provider", roles: ["provider", "admin"], icon: Radio },
  { to: "/enforcement", labelKey: "nav.enforcement", roles: ["enforcement", "admin"], icon: Radar },
  { to: "/admin", labelKey: "nav.admin", roles: ["admin"], icon: ShieldCheck },
];

export type AnchorLink = { href: string; labelKey: string };

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function AppShell({ children, anchors }: { children: ReactNode; anchors?: AnchorLink[] }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useSession();
  const { data: rolesData } = useMyRoles();
  const router = useRouter();
  const qc = useQueryClient();
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/", replace: true });
  }

  const visibleNav = user
    ? NAV.filter((n) => !n.roles || hasRole(rolesData?.roles, ...n.roles))
    : [];

  const showWorkspace = visibleNav.length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground focus:shadow-lg"
      >
        {t("nav.skip")}
      </a>

      <div className="pointer-events-none fixed inset-x-0 top-0 z-30 h-16 bg-gradient-to-b from-background via-background/80 to-transparent md:h-22" />

      <header className="fixed inset-x-0 top-0 z-40 px-4 pt-3 md:pt-4">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between rounded-2xl border border-border/60 bg-background/75 px-3 shadow-[0_8px_32px_-12px_color-mix(in_oklch,var(--primary)_18%,transparent),0_1px_0_0_rgba(255,255,255,0.5)_inset] backdrop-blur-xl supports-[backdrop-filter]:bg-background/65 md:h-22 md:rounded-3xl md:px-5">
          <Link to="/" className="group flex items-center" aria-label="ParkPunkt — home">
            <img src={logoAsset.url} alt="ParkPunkt" className="h-10 w-auto transition-transform duration-300 group-hover:scale-105 md:h-16" />
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {showWorkspace && (
              <CommandRail visibleNav={visibleNav} anchors={anchors} />
            )}
            {!showWorkspace && anchors && anchors.length > 0 && (
              <AnchorRail anchors={anchors} />
            )}
          </div>

          <div className="hidden items-center gap-1 md:flex">
            <Link
              to="/blog"
              className={cn(
                "group inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground",
                pathname.startsWith("/blog") && "text-foreground"
              )}
            >
              <BookOpen className="h-3.5 w-3.5 transition-transform group-hover:-rotate-6" />
              <span>{t("nav.journal")}</span>
            </Link>
            <div className="h-6 w-px bg-border/70" />
            <LangToggle />
            {user ? (
              <div className="ml-1 flex items-center gap-1">
                <div className="group hidden items-center gap-2 rounded-full border border-border/70 bg-gradient-to-b from-secondary/70 to-secondary/40 py-1 pl-1 pr-3 shadow-sm transition-all hover:border-accent/40 hover:shadow-md sm:inline-flex">
                  <span className="relative grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-primary via-primary-glow to-accent text-[11px] font-semibold uppercase text-primary-foreground shadow-[0_0_0_2px_var(--background),0_4px_10px_-2px_color-mix(in_oklch,var(--accent)_45%,transparent)]">
                    {(user.email ?? "?").slice(0, 1)}
                    <span className="absolute -bottom-0 -right-0 h-2 w-2 rounded-full bg-accent ring-2 ring-background" />
                  </span>
                  <span className="max-w-[140px] truncate text-xs font-medium text-foreground/80">{user.email}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={signOut} className="rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={t("nav.signout")}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button asChild size="sm" className="group ml-1 rounded-full bg-gradient-to-b from-primary to-primary/90 shadow-[var(--shadow-soft)] transition-all hover:shadow-[0_10px_30px_-8px_color-mix(in_oklch,var(--primary)_50%,transparent)]">
                <Link to="/auth">
                  {t("nav.signin")}
                  <span className="ml-1 inline-block transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <LangToggle />
            <Button
              variant="ghost"
              size="icon"
              aria-label={mobileOpen ? t("nav.close") : t("nav.menu")}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className={cn(
                "rounded-full transition-colors",
                mobileOpen ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-foreground"
              )}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <MobileOverlay
          anchors={anchors}
          visibleNav={visibleNav}
          user={user}
          signOut={signOut}
          onClose={() => setMobileOpen(false)}
        />
      )}

      <main id="main" className="pt-20 md:pt-28">{children}</main>
    </div>
  );
}

function CommandRail({ visibleNav, anchors }: { visibleNav: NavItem[]; anchors?: AnchorLink[] }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useI18n();
  const railRef = useRef<HTMLDivElement>(null);
  const [glider, setGlider] = useState({ left: 0, width: 0, opacity: 0 });
  const [mounted, setMounted] = useState(false);

  useIsomorphicLayoutEffect(() => {
    setMounted(true);
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (!mounted || !railRef.current) return;
    const active = railRef.current.querySelector("[data-active='true']") as HTMLElement | null;
    if (active) {
      setGlider({ left: active.offsetLeft, width: active.offsetWidth, opacity: 1 });
    }
  }, [pathname, mounted, visibleNav.length]);

  const items: (NavItem & { exact?: boolean })[] = [
    { to: "/", labelKey: "nav.home", icon: Home, exact: true },
    ...visibleNav,
  ];

  return (
    <nav
      ref={railRef}
      className="relative flex items-center rounded-full border border-border/70 bg-gradient-to-b from-secondary/60 to-secondary/30 p-1 shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,0_6px_24px_-10px_color-mix(in_oklch,var(--primary)_22%,transparent)]"
    >
      <span
        className="pointer-events-none absolute top-1 h-[calc(100%-8px)] rounded-full bg-gradient-to-b from-primary to-primary/85 shadow-[0_6px_20px_-6px_color-mix(in_oklch,var(--primary)_55%,transparent),0_1px_0_0_rgba(255,255,255,0.15)_inset] ring-1 ring-inset ring-white/15 transition-[left,width,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ left: glider.left, width: glider.width, opacity: glider.opacity }}
      />
      {items.map((n) => {
        const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
        const Icon = n.icon;
        return (
          <Link
            key={n.to}
            to={n.to}
            data-active={active}
            className={cn(
              "group relative z-10 inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium tracking-tight transition-colors duration-200",
              active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("h-3.5 w-3.5 shrink-0 transition-transform duration-300", active ? "text-accent drop-shadow-[0_0_6px_color-mix(in_oklch,var(--accent)_60%,transparent)]" : "group-hover:scale-110 group-hover:rotate-[-6deg]")} />
            <span>{t(n.labelKey as never)}</span>
          </Link>
        );
      })}
      {anchors && anchors.length > 0 && (
        <>
          <span className="mx-1 hidden h-4 w-px bg-border/80 lg:block" />
          {anchors.map((a) => (
            <a
              key={a.href}
              href={a.href}
              className="hidden whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground lg:inline-flex"
            >
              {t(a.labelKey as never)}
            </a>
          ))}
        </>
      )}
    </nav>
  );
}

function AnchorRail({ anchors }: { anchors: AnchorLink[] }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useI18n();
  return (
    <nav className="flex items-center gap-1 rounded-full border border-border/70 bg-secondary/40 px-1 py-1">
      <Link
        to="/"
        className={cn(
          "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
          pathname === "/" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
        )}
      >
        <Home className="h-3.5 w-3.5 shrink-0" />
        {t("nav.home")}
      </Link>
      {anchors.map((a) => (
        <a
          key={a.href}
          href={a.href}
          className="hidden whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground lg:inline-flex"
        >
          {t(a.labelKey as never)}
        </a>
      ))}
    </nav>
  );
}

function MobileOverlay({
  anchors,
  visibleNav,
  user,
  signOut,
  onClose,
}: {
  anchors?: AnchorLink[];
  visibleNav: NavItem[];
  user: { email?: string | undefined } | null;
  signOut: () => void;
  onClose: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useI18n();

  const mainItems = [
    { to: "/", label: t("nav.home"), icon: Home, exact: true },
    { to: "/drive", label: t("nav.driver"), icon: Car },
    { to: "/blog", label: t("nav.journal"), icon: BookOpen },
    ...visibleNav.filter((n) => n.to !== "/drive").map((n) => ({ to: n.to, label: t(n.labelKey as never), icon: n.icon })),
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl md:hidden">
      <div className="flex h-16 items-center justify-between px-4">
        <span className="text-sm font-semibold tracking-tight">ParkPunkt</span>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
          <X className="h-5 w-5" />
        </Button>
      </div>
      <nav className="mx-auto flex max-w-md flex-col gap-2 px-6 pt-6">
        {mainItems.map((item, idx) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={cn(
                "group flex items-center gap-4 whitespace-nowrap rounded-2xl px-4 py-4 text-lg font-semibold transition-all",
                active
                  ? "bg-gradient-to-r from-primary to-primary/85 text-primary-foreground shadow-lg"
                  : "text-foreground hover:bg-secondary/70"
              )}
              style={{ animation: `slideIn 0.35s ease-out ${idx * 0.05}s both` }}
            >
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110", active ? "bg-white/15" : "bg-secondary")}>
                <Icon className="h-5 w-5" />
              </span>
              {item.label}
            </Link>
          );
        })}

        {anchors && anchors.length > 0 && (
          <div className="mt-4 border-t border-border/60 pt-4">
            <p className="mb-2 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("nav.onpage")}</p>
            {anchors.map((a, idx) => (
              <a
                key={a.href}
                href={a.href}
                onClick={onClose}
                className="block rounded-xl px-4 py-3 text-base text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
                style={{ animation: `slideIn 0.35s ease-out ${(mainItems.length + idx) * 0.05}s both` }}
              >
                {t(a.labelKey as never)}
              </a>
            ))}
          </div>
        )}

        <div className="mt-6 border-t border-border/60 pt-6">
          {user ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 px-4">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-semibold text-primary-foreground">
                  {(user.email ?? "?").slice(0, 1)}
                </span>
                <span className="truncate text-sm text-muted-foreground">{user.email}</span>
              </div>
              <Button onClick={signOut} variant="destructive" className="w-full rounded-xl">
                <LogOut className="mr-2 h-4 w-4" /> {t("nav.signout")}
              </Button>
            </div>
          ) : (
            <Button asChild size="lg" className="w-full rounded-xl">
              <Link to="/auth" onClick={onClose}>{t("nav.signin")} →</Link>
            </Button>
          )}
        </div>
      </nav>
    </div>
  );
}
