import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import logoAsset from "@/assets/parkpunkt-logo.png.asset.json";
import { ensureDevUserFn } from "@/lib/dev-auth.functions";
import { useServerFn } from "@tanstack/react-start";
import { Bug, Shield, Building2, Radio, Radar, Car } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ParkPunkt" },
      { name: "description", content: "Sign in to access ParkPunkt operator, provider, enforcement or admin dashboards." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const [devBusy, setDevBusy] = useState<string | null>(null);
  const ensureDev = useServerFn(ensureDevUserFn);
  const { t } = useI18n();

  // If already signed in, bounce out
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: redirect ?? "/", replace: true });
    });
  }, [navigate, redirect]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: displayName || email } },
        });
        if (error) throw error;
        toast.success(t("auth.accountCreated"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: redirect ?? "/", replace: true });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error(result.error.message ?? t("auth.googleFailed"));
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: redirect ?? "/", replace: true });
  }

  async function devSignIn(role: "admin" | "operator" | "provider" | "enforcement" | "driver") {
    setDevBusy(role);
    try {
      const creds = await ensureDev({ data: { role } });
      const { error } = await supabase.auth.signInWithPassword({ email: creds.email, password: creds.password });
      if (error) throw error;
      toast.success(`${t("auth.signedInAs")} ${creds.name}`);
      const dest = role === "driver" ? "/drive" : role === "admin" ? "/admin" : `/${role}`;
      navigate({ to: redirect ?? dest, replace: true });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDevBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10">
        <Link to="/" className="mb-6"><img src={logoAsset.url} alt="ParkPunkt" className="h-10 w-auto" /></Link>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{mode === "signin" ? t("auth.signin") : t("auth.signup")}</CardTitle>
            <CardDescription>{t("auth.desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button type="button" variant="outline" className="w-full" onClick={onGoogle} disabled={busy}>
              {t("auth.google")}
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" /><span>{t("auth.or")}</span><div className="h-px flex-1 bg-border" /></div>
            <form onSubmit={onSubmit} className="space-y-3">
              {mode === "signup" && (
                <div className="space-y-1"><Label>{t("auth.name")}</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t("auth.name.placeholder")} /></div>
              )}
              <div className="space-y-1"><Label>{t("auth.email")}</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></div>
              <div className="space-y-1"><Label>{t("auth.password")}</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} /></div>
              <Button type="submit" className="w-full" disabled={busy}>{mode === "signin" ? t("auth.signin") : t("auth.signup")}</Button>
            </form>
            <div className="text-center text-sm">
              {mode === "signin" ? (
                <button className="text-primary underline" onClick={() => setMode("signup")}>{t("auth.needAccount")}</button>
              ) : (
                <button className="text-primary underline" onClick={() => setMode("signin")}>{t("auth.haveAccount")}</button>
              )}
            </div>
            <div className="text-center text-xs text-muted-foreground">
              {t("auth.driverHint1")} <Link to="/" className="underline">{t("auth.driverHint2")}</Link>.
            </div>
          </CardContent>
        </Card>

        {/* Dev login panel */}
        <div className="mt-4 w-full">
          <button
            onClick={() => setDevOpen((v) => !v)}
            className="flex w-full items-center gap-2 rounded-md border border-dashed border-border bg-secondary/40 px-3 py-2 text-left text-xs text-muted-foreground hover:border-accent hover:text-foreground"
          >
            <Bug className="h-4 w-4 text-accent" />
            <span className="font-medium">{t("dev.title")}</span>
            <span className="ml-auto">{devOpen ? t("dev.hide") : t("dev.show")}</span>
          </button>
          {devOpen && (
            <Card className="mt-2 border-dashed">
              <CardContent className="space-y-2 p-3 text-sm">
                <p className="text-xs text-muted-foreground">
                  {t("dev.sub")} <code className="rounded bg-secondary px-1">devpass1234</code>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { r: "admin", labelKey: "nav.admin", Icon: Shield },
                      { r: "operator", labelKey: "nav.operator", Icon: Building2 },
                      { r: "provider", labelKey: "nav.provider", Icon: Radio },
                      { r: "enforcement", labelKey: "nav.enforcement", Icon: Radar },
                      { r: "driver", labelKey: "nav.driver", Icon: Car },
                    ] as const
                  ).map(({ r, labelKey, Icon }) => (
                    <Button
                      key={r}
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      disabled={devBusy !== null}
                      onClick={() => devSignIn(r)}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {devBusy === r ? t("dev.creating") : t(labelKey as never)}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}