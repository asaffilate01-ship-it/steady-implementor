import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import logoAsset from "@/assets/parkpunkt-logo.png.asset.json";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useSession, useMyRoles, hasRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Car, Building2, Radio, Radar, ShieldCheck, type LucideIcon } from "lucide-react";
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

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useSession();
  const { data: rolesData } = useMyRoles();
  const router = useRouter();
  const qc = useQueryClient();
  const { t } = useI18n();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/", replace: true });
  }

  // Only signed-in users see the workspace nav. Everyone else just sees the logo + Sign in.
  const visibleNav = user
    ? NAV.filter((n) => !n.roles || hasRole(rolesData?.roles, ...n.roles))
    : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:h-30">
          <Link to="/" className="group flex items-center gap-2">
            <img src={logoAsset.url} alt="ParkPunkt" className="h-10 w-auto transition-transform group-hover:scale-105 md:h-26" />
          </Link>
          {visibleNav.length > 0 && (
            <nav className="relative ml-4 hidden items-center gap-0.5 rounded-full border border-border/70 bg-gradient-to-b from-secondary/60 to-secondary/30 p-1 text-sm shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,0_4px_20px_-8px_color-mix(in_oklch,var(--primary)_25%,transparent)] backdrop-blur md:flex md:w-fit">
              {visibleNav.map((n) => {
                const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
                const Icon = n.icon;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={cn(
                      "group relative inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-medium tracking-tight transition-all duration-300 ease-out",
                      active
                        ? "bg-gradient-to-b from-primary to-primary/85 text-primary-foreground shadow-[0_6px_18px_-6px_color-mix(in_oklch,var(--primary)_65%,transparent),0_1px_0_0_rgba(255,255,255,0.15)_inset] ring-1 ring-inset ring-white/15"
                        : "text-muted-foreground hover:bg-background/70 hover:text-foreground hover:shadow-sm",
                    )}
                  >
                    <Icon className={cn("h-3.5 w-3.5 transition-transform duration-300", active ? "text-accent drop-shadow-[0_0_6px_color-mix(in_oklch,var(--accent)_60%,transparent)]" : "group-hover:scale-110 group-hover:rotate-[-4deg]")} />
                    <span>{t(n.labelKey as never)}</span>
                    {active && (
                      <span className="ml-0.5 h-1 w-1 rounded-full bg-accent shadow-[0_0_8px_color-mix(in_oklch,var(--accent)_80%,transparent)]" />
                    )}
                  </Link>
                );
              })}
            </nav>
          )}
          {visibleNav.length > 0 && (
            <nav className="ml-2 flex flex-1 flex-wrap items-center gap-1 rounded-2xl border border-border/60 bg-secondary/40 p-1 text-sm shadow-sm md:hidden">
              {visibleNav.map((n) => {
                const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
                const Icon = n.icon;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all",
                      active
                        ? "bg-gradient-to-b from-primary to-primary/85 text-primary-foreground shadow-[0_4px_10px_-4px_color-mix(in_oklch,var(--primary)_55%,transparent)] ring-1 ring-inset ring-white/10"
                        : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
                    )}
                    aria-label={t(n.labelKey as never)}
                  >
                    <Icon className={cn("h-3.5 w-3.5", active && "text-accent")} />
                    <span className="hidden xs:inline">{t(n.labelKey as never)}</span>
                  </Link>
                );
              })}
            </nav>
          )}
          <div className="ml-auto flex items-center gap-2 text-sm">
            <LangToggle />
            {user ? (
              <>
                <div className="group hidden items-center gap-2 rounded-full border border-border/70 bg-gradient-to-b from-secondary/60 to-secondary/30 py-1 pl-1 pr-3 shadow-sm transition-all hover:border-accent/40 hover:shadow-md sm:inline-flex">
                  <span className="relative grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-primary via-primary-glow to-accent text-[11px] font-semibold uppercase text-primary-foreground shadow-[0_0_0_2px_var(--background),0_4px_10px_-2px_color-mix(in_oklch,var(--accent)_45%,transparent)]">
                    {(user.email ?? "?").slice(0, 1)}
                    <span className="absolute -bottom-0 -right-0 h-2 w-2 rounded-full bg-accent ring-2 ring-background" />
                  </span>
                  <span className="max-w-[160px] truncate text-xs font-medium text-foreground/80">{user.email}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={signOut} className="rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <LogOut className="mr-1 h-4 w-4" /> <span className="hidden sm:inline">{t("nav.signout")}</span>
                </Button>
              </>
            ) : (
              <Button asChild size="sm" className="group rounded-full bg-gradient-to-b from-primary to-primary/90 shadow-[var(--shadow-elegant)] transition-all hover:shadow-[0_10px_30px_-8px_color-mix(in_oklch,var(--primary)_50%,transparent)]">
                <Link to="/auth">
                  {t("nav.signin")}
                  <span className="ml-1.5 inline-block transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}