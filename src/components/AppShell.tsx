import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import logoAsset from "@/assets/parkpunkt-logo.png.asset.json";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useSession, useMyRoles, hasRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import type { AppRole } from "@/lib/auth.functions";
import { LangToggle, useI18n } from "@/lib/i18n";

type NavItem = { to: string; labelKey: string; roles?: AppRole[] };
const NAV: NavItem[] = [
  { to: "/drive", labelKey: "nav.driver" },
  { to: "/operator", labelKey: "nav.operator", roles: ["operator", "admin"] },
  { to: "/provider", labelKey: "nav.provider", roles: ["provider", "admin"] },
  { to: "/enforcement", labelKey: "nav.enforcement", roles: ["enforcement", "admin"] },
  { to: "/admin", labelKey: "nav.admin", roles: ["admin"] },
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
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoAsset.url} alt="ParkPunkt" className="h-8 w-auto" />
          </Link>
          <nav className="ml-2 flex flex-1 flex-wrap items-center gap-1 text-sm">
            {visibleNav.map((n) => {
              const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "rounded-md px-3 py-1.5 transition-colors",
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {t(n.labelKey as never)}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <LangToggle />
            {user ? (
              <>
                <span className="hidden text-xs text-muted-foreground sm:inline">{user.email}</span>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  <LogOut className="mr-1 h-4 w-4" /> {t("nav.signout")}
                </Button>
              </>
            ) : (
              <Button asChild size="sm" variant="outline">
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