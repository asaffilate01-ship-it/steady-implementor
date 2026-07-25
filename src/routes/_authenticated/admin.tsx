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
import { useStore, euros } from "@/lib/parkpunkt-data";
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
  const sites = useStore((s) => s.sites);
  const sessions = useStore((s) => s.sessions);
  const notices = useStore((s) => s.notices);
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

  const gmv = sessions.reduce((sum, s) => sum + s.amountCents, 0);
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
    </div>
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