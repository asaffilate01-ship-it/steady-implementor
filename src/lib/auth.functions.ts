import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type AppRole = "admin" | "operator" | "provider" | "enforcement";

/** Roles for the caller. Used to gate dashboards on the client. */
export const getMyRolesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { userId: context.userId, roles: (data ?? []).map((r) => r.role as AppRole) };
  });

/** Admin-only: list all users with their roles & profile. */
export const listUsersWithRolesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: usersData, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (usersErr) throw new Error(usersErr.message);

    const ids = usersData.users.map((u) => u.id);
    const [{ data: roles }, { data: profiles }, { data: orgs }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role, org_id").in("user_id", ids),
      supabaseAdmin.from("profiles").select("id, display_name, org_id").in("id", ids),
      supabaseAdmin.from("orgs").select("id, name, kind"),
    ]);

    return usersData.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      profile: profiles?.find((p) => p.id === u.id) ?? null,
      roles: (roles ?? []).filter((r) => r.user_id === u.id).map((r) => ({ role: r.role as AppRole, org_id: r.org_id })),
      orgs: orgs ?? [],
    }));
  });

const grantSchema = z.object({
  target_user_id: z.string().uuid(),
  role: z.enum(["admin", "operator", "provider", "enforcement"]),
  org_id: z.string().uuid().nullable().optional(),
});

export const grantRoleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => grantSchema.parse(input))
  .handler(async ({ data, context }) => {
    // RLS enforces admin — this call runs as the caller, no service role needed.
    const { error } = await context.supabase
      .from("user_roles")
      .upsert(
        { user_id: data.target_user_id, role: data.role, org_id: data.org_id ?? null },
        { onConflict: "user_id,role" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeRoleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ target_user_id: z.string().uuid(), role: z.enum(["admin", "operator", "provider", "enforcement"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.target_user_id)
      .eq("role", data.role);
    if (error) throw new Error(error.message);
    return { ok: true };
  });