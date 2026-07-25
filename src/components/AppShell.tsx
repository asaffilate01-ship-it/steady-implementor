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
            <nav className="ml-4 hidden flex-1 items-center gap-1 rounded-full border border-border/70 bg-secondary/40 p-1 text-sm shadow-sm md:flex md:w-fit">
              {visibleNav.map((n) => {
                const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
                const Icon = n.icon;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={cn(
                      "group relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-medium transition-all duration-200",
                      active
                        ? "bg-gradient-to-b from-primary to-primary/85 text-primary-foreground shadow-[0_4px_14px_-4px_color-mix(in_oklch,var(--primary)_60%,transparent)] ring-1 ring-inset ring-white/10"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("h-3.5 w-3.5 transition-transform", active ? "text-accent" : "group-hover:scale-110")} />
                    {t(n.labelKey as never)}
                  </Link>
                );
              })}
            </nav>
          )}
          {visibleNav.length > 0 && (
            <nav className="ml-2 flex flex-1 flex-wrap items-center gap-1 text-sm md:hidden">
              {visibleNav.map((n) => {
                const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
                const Icon = n.icon;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors",
                      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                    aria-label={t(n.labelKey as never)}
                  >
                    <Icon className="h-3.5 w-3.5" />
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
                <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-secondary/50 py-1 pl-1 pr-3 sm:inline-flex">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-[10px] font-semibold uppercase text-primary-foreground">
                    {(user.email ?? "?").slice(0, 1)}
                  </span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={signOut} className="rounded-full">
                  <LogOut className="mr-1 h-4 w-4" /> {t("nav.signout")}
                </Button>
              </>
            ) : (
              <Button asChild size="sm" className="rounded-full shadow-[var(--shadow-elegant)]">
                <Link to="/auth">{t("nav.signin")}</Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}