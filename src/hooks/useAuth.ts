import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getMyRolesFn, type AppRole } from "@/lib/auth.functions";

export function useSession(): { session: Session | null; user: User | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  return { session, user: session?.user ?? null, loading };
}

export function useMyRoles() {
  const { user } = useSession();
  const fetchRoles = useServerFn(getMyRolesFn);
  return useQuery({
    queryKey: ["my-roles", user?.id],
    queryFn: () => fetchRoles(),
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function hasRole(roles: AppRole[] | undefined, ...allowed: AppRole[]) {
  if (!roles) return false;
  return roles.some((r) => allowed.includes(r));
}