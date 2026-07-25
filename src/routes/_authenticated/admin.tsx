import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listUsersWithRolesFn, grantRoleFn, revokeRoleFn, type AppRole } from "@/lib/auth.functions";
import { euros, useSites, useSessions, useNotices, useRealtimeSync } from "@/lib/parkpunkt-db";
import { useProviders, useSiteMappings } from "@/lib/providers-db";
import { upsertProviderFn, deleteProviderFn, syncProviderFn } from "@/lib/providers.functions";
import { listOrgsFn, updateOrgCommissionFn, updateProviderCommissionFn, type Org } from "@/lib/commission.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plug, RefreshCw, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Shield, ShieldCheck, X, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "ParkPunkt Admin" },
      { name: "description", content: "Platform administration: users, roles, and organizations." },
      { property: "og:title", content: "ParkPunkt Admin" },
      { property: "og:description", content: "User & role management for the ParkPunkt platform." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminGated,
});

function AdminGated() {
  return (
    <AppShell>
      <RoleGate allow={["admin"]}>
        <AdminConsole />
      </RoleGate>
    </AppShell>
  );
}

const ROLES: AppRole[] = ["admin", "operator", "provider", "enforcement"];

function AdminConsole() {
  useRealtimeSync(["sites", "sessions", "notices"]);
  const { data: sites = [] } = useSites();
  const { data: sessions = [] } = useSessions();
  const { data: notices = [] } = useNotices();
  const { t } = useI18n();
  const listUsers = useServerFn(listUsersWithRolesFn);
  const grant = useServerFn(grantRoleFn);
  const revoke = useServerFn(revokeRoleFn);
  const qc = useQueryClient();

  const usersQ = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listUsers(),
  });

  const grantM = useMutation({
    mutationFn: (v: { target_user_id: string; role: AppRole; org_id: string | null }) => grant({ data: v }),
    onSuccess: () => { toast.success(t("adm.granted")); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const revokeM = useMutation({
    mutationFn: (v: { target_user_id: string; role: AppRole }) => revoke({ data: v }),
    onSuccess: () => { toast.success(t("adm.revoked")); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const gmv = sessions.reduce((sum, s) => sum + s.amount_cents, 0);
  const orgs = usersQ.data?.[0]?.orgs ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">{t("adm.title")}</h1><p className="text-sm text-muted-foreground">{t("adm.sub")}</p></div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label={t("adm.kpi.sites")} value={sites.length} />
        <Stat label={t("adm.kpi.sessions")} value={sessions.length} />
        <Stat label={t("adm.kpi.notices")} value={notices.length} />
        <Stat label={t("adm.kpi.gmv")} value={euros(gmv)} />
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4" /> {t("adm.users")}</CardTitle></CardHeader>
        <CardContent>
          {usersQ.isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {t("adm.loading")}</div>}
          {usersQ.error && <div className="text-sm text-destructive">{(usersQ.error as Error).message}</div>}
          {usersQ.data && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="py-2">{t("adm.col.user")}</th><th>{t("adm.col.roles")}</th><th className="w-[380px]">{t("adm.col.grant")}</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {usersQ.data.map((u) => (
                    <UserRow
                      key={u.id}
                      user={u}
                      orgs={orgs}
                      onGrant={(role, org_id) => grantM.mutate({ target_user_id: u.id, role, org_id })}
                      onRevoke={(role) => revokeM.mutate({ target_user_id: u.id, role })}
                      pending={grantM.isPending || revokeM.isPending}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("adm.orgs")}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            {orgs.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                <div><div className="font-medium">{o.name}</div><div className="text-xs text-muted-foreground font-mono">{o.id}</div></div>
                <Badge variant="outline" className="capitalize">{o.kind}</Badge>
              </div>
            ))}
            {orgs.length === 0 && <div className="text-sm text-muted-foreground">{t("adm.orgs.empty")}</div>}
          </div>
        </CardContent>
      </Card>

      <ProvidersAdmin />
      <CommissionAdmin />
    </div>
  );
}

function ProvidersAdmin() {
  const { t } = useI18n();
  const { data: providers = [] } = useProviders();
  const { data: mappings = [] } = useSiteMappings();
  const qc = useQueryClient();
  const upsert = useServerFn(upsertProviderFn);
  const del = useServerFn(deleteProviderFn);
  const sync = useServerFn(syncProviderFn);
  const [form, setForm] = useState({ name: "", slug: "", kind: "operator" as const, api_base_url: "", status: "onboarding" as const, notes: "" });

  const saveM = useMutation({
    mutationFn: () => upsert({ data: {
      name: form.name, slug: form.slug, kind: form.kind,
      api_base_url: form.api_base_url || null, status: form.status, notes: form.notes || null,
    } }),
    onSuccess: () => { toast.success(t("adm.provSaved")); setForm({ name: "", slug: "", kind: "operator", api_base_url: "", status: "onboarding", notes: "" }); qc.invalidateQueries({ queryKey: ["providers"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success(t("adm.provDeleted")); qc.invalidateQueries({ queryKey: ["providers"] }); qc.invalidateQueries({ queryKey: ["sites"] }); },
  });
  const syncM = useMutation({
    mutationFn: (id: string) => sync({ data: { provider_id: id } }),
    onSuccess: (r) => { toast.success(`${t("adm.provSynced")} +${r.created} / ~${r.updated}`); qc.invalidateQueries({ queryKey: ["sites"] }); qc.invalidateQueries({ queryKey: ["providers"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const siteCountBySlug = mappings.reduce<Record<string, number>>((acc, m) => {
    acc[m.provider_id] = (acc[m.provider_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Plug className="h-4 w-4" /> {t("adm.providers")}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-6">
          <div className="md:col-span-2"><Label className="text-xs">{t("adm.provName")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label className="text-xs">{t("adm.provSlug")}</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} /></div>
          <div><Label className="text-xs">{t("adm.provKind")}</Label>
            <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as typeof form.kind })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["operator","municipal","datex","handyparken","other"] as const).map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label className="text-xs">{t("adm.provBase")}</Label><Input placeholder="https://…" value={form.api_base_url} onChange={(e) => setForm({ ...form, api_base_url: e.target.value })} /></div>
          <div className="md:col-span-6"><Button size="sm" disabled={!form.name || !form.slug || saveM.isPending} onClick={() => saveM.mutate()}><Plus className="mr-1 h-3 w-3" />{t("adm.provAdd")}</Button></div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="py-2">{t("adm.provName")}</th><th>{t("adm.provKind")}</th><th>{t("adm.provStatus")}</th><th>{t("adm.provSites")}</th><th></th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {providers.map((p) => (
                <tr key={p.id}>
                  <td className="py-2"><div className="font-medium">{p.name}</div><div className="font-mono text-xs text-muted-foreground">{p.slug}</div></td>
                  <td><Badge variant="outline">{p.kind}</Badge></td>
                  <td><Badge variant={p.status === "active" ? "default" : p.status === "paused" ? "destructive" : "secondary"}>{p.status}</Badge></td>
                  <td className="text-xs text-muted-foreground">{siteCountBySlug[p.id] ?? 0}</td>
                  <td className="text-right">
                    <Button size="sm" variant="outline" disabled={syncM.isPending} onClick={() => syncM.mutate(p.id)}><RefreshCw className="mr-1 h-3 w-3" />{t("adm.provSync")}</Button>
                    <Button size="sm" variant="ghost" className="ml-2 text-destructive" onClick={() => delM.mutate(p.id)}><Trash2 className="h-3 w-3" /></Button>
                  </td>
                </tr>
              ))}
              {providers.length === 0 && <tr><td colSpan={5} className="py-3 text-center text-sm text-muted-foreground">{t("adm.provNone")}</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

type UserRoleRow = { role: AppRole; org_id: string | null };
type AdminUser = {
  id: string; email: string; created_at: string;
  profile: { id: string; display_name: string | null; org_id: string | null } | null;
  roles: UserRoleRow[];
  orgs: { id: string; name: string; kind: string }[];
};

function UserRow({
  user, orgs, onGrant, onRevoke, pending,
}: {
  user: AdminUser;
  orgs: { id: string; name: string; kind: string }[];
  onGrant: (role: AppRole, org_id: string | null) => void;
  onRevoke: (role: AppRole) => void;
  pending: boolean;
}) {
  const [role, setRole] = useState<AppRole>("operator");
  const [orgId, setOrgId] = useState<string>("__none");
  const { t } = useI18n();
  return (
    <tr>
      <td className="py-3 align-top">
        <div className="font-medium">{user.profile?.display_name || user.email}</div>
        <div className="text-xs text-muted-foreground">{user.email}</div>
      </td>
      <td className="py-3 align-top">
        <div className="flex flex-wrap gap-1">
          {user.roles.length === 0 && <span className="text-xs text-muted-foreground">{t("adm.noRoles")}</span>}
          {user.roles.map((r) => (
            <Badge key={r.role} variant="secondary" className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />{r.role}
              <button className="ml-1 rounded hover:bg-destructive/20" disabled={pending} onClick={() => onRevoke(r.role)} aria-label={`${t("adm.revoke")} ${r.role}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </td>
      <td className="py-3 align-top">
        <div className="flex items-center gap-2">
          <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={orgId} onValueChange={setOrgId}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder={t("adm.orgOptional")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">{t("adm.noOrg")}</SelectItem>
              {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={pending} onClick={() => onGrant(role, orgId === "__none" ? null : orgId)}>{t("adm.grant")}</Button>
        </div>
      </td>
    </tr>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">{label}</div><div className="mt-1 text-2xl font-semibold">{value}</div></CardContent></Card>
  );
}

function CommissionAdmin() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const listOrgs = useServerFn(listOrgsFn);
  const updateOrg = useServerFn(updateOrgCommissionFn);
  const updateProvider = useServerFn(updateProviderCommissionFn);
  const { data: providers = [] } = useProviders();

  const orgsQ = useQuery({
    queryKey: ["admin-orgs"],
    queryFn: () => listOrgs(),
  });

  const saveOrgM = useMutation({
    mutationFn: (v: { org_id: string; platform_fee_bps: number; platform_fixed_fee_cents: number }) => updateOrg({ data: v }),
    onSuccess: () => { toast.success(t("adm.commission.saved")); qc.invalidateQueries({ queryKey: ["admin-orgs"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const saveProvM = useMutation({
    mutationFn: (v: { provider_id: string; platform_fee_bps: number; platform_fixed_fee_cents: number }) => updateProvider({ data: v }),
    onSuccess: () => { toast.success(t("adm.commission.saved")); qc.invalidateQueries({ queryKey: ["providers"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Card>
      <CardHeader><CardTitle>{t("adm.commission.title")}</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">{t("adm.commission.sub")}</p>

        <div>
          <h3 className="mb-3 text-sm font-medium">{t("adm.commission.org")}</h3>
          {orgsQ.isLoading && <div className="text-sm text-muted-foreground">{t("common.loading")}</div>}
          <div className="grid gap-3">
            {orgsQ.data?.map((o) => (
              <CommissionRow
                key={o.id}
                name={o.name}
                bps={o.platform_fee_bps}
                fixed={o.platform_fixed_fee_cents}
                onSave={(bps, fixed) => saveOrgM.mutate({ org_id: o.id, platform_fee_bps: bps, platform_fixed_fee_cents: fixed })}
                pending={saveOrgM.isPending}
              />
            ))}
            {orgsQ.data?.length === 0 && <div className="text-sm text-muted-foreground">{t("adm.orgs.empty")}</div>}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-medium">{t("adm.commission.provider")}</h3>
          <div className="grid gap-3">
            {providers.map((p) => (
              <CommissionRow
                key={p.id}
                name={p.name}
                bps={p.platform_fee_bps}
                fixed={p.platform_fixed_fee_cents}
                onSave={(bps, fixed) => saveProvM.mutate({ provider_id: p.id, platform_fee_bps: bps, platform_fixed_fee_cents: fixed })}
                pending={saveProvM.isPending}
              />
            ))}
            {providers.length === 0 && <div className="text-sm text-muted-foreground">{t("adm.provNone")}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CommissionRow({
  name, bps, fixed, onSave, pending,
}: {
  name: string;
  bps: number;
  fixed: number;
  onSave: (bps: number, fixed: number) => void;
  pending: boolean;
}) {
  const { t } = useI18n();
  const [feePct, setFeePct] = useState(bps / 100);
  const [feeFixed, setFeeFixed] = useState(fixed);
  const changed = feePct !== bps / 100 || feeFixed !== fixed;
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border border-border p-3 text-sm">
      <div className="min-w-[180px] flex-1">
        <div className="font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">{(feePct).toFixed(2)}% + {feeFixed}¢</div>
      </div>
      <div className="w-32">
        <Label className="text-xs">{t("adm.commission.bps")}</Label>
        <Input type="number" step="0.1" value={feePct} onChange={(e) => setFeePct(parseFloat(e.target.value) || 0)} />
      </div>
      <div className="w-32">
        <Label className="text-xs">{t("adm.commission.fixed")}</Label>
        <Input type="number" value={feeFixed} onChange={(e) => setFeeFixed(parseInt(e.target.value) || 0)} />
      </div>
      <div>
        <Button size="sm" disabled={!changed || pending} onClick={() => onSave(Math.round(feePct * 100), feeFixed)}>{t("adm.commission.save")}</Button>
      </div>
    </div>
  );
}