import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useMyRoles, hasRole } from "@/hooks/useAuth";
import type { AppRole } from "@/lib/auth.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Loader2 } from "lucide-react";

export function RoleGate({ allow, children }: { allow: AppRole[]; children: ReactNode }) {
  const { data, isLoading, error } = useMyRoles();

  if (isLoading) {
    return (
      <div className="grid place-items-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md py-20">
        <Card><CardContent className="p-6 text-center text-sm text-destructive">Could not verify your permissions.</CardContent></Card>
      </div>
    );
  }

  const ok = hasRole(data?.roles, ...allow);
  if (!ok) {
    return (
      <div className="mx-auto max-w-md py-20">
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive"><ShieldAlert className="h-6 w-6" /></div>
            <div>
              <div className="text-lg font-semibold">Access denied</div>
              <p className="mt-1 text-sm text-muted-foreground">
                This dashboard requires the {allow.join(" or ")} role. Ask an administrator to grant access.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">Your roles: {data?.roles.length ? data.roles.join(", ") : "none"}</p>
            </div>
            <div className="flex justify-center gap-2">
              <Button asChild variant="secondary"><Link to="/">Back to driver</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}