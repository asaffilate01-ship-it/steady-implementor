import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const roleSchema = z.enum(["admin", "operator", "provider", "enforcement", "driver"]);

const DEV_PASSWORD = "devpass1234";

const PROFILE: Record<z.infer<typeof roleSchema>, { email: string; name: string }> = {
  admin: { email: "admin@parkpunkt.dev", name: "Ada Admin" },
  operator: { email: "operator@parkpunkt.dev", name: "Otto Operator" },
  provider: { email: "provider@parkpunkt.dev", name: "Pia Provider" },
  enforcement: { email: "enforcement@parkpunkt.dev", name: "Erik Enforcement" },
  driver: { email: "driver@parkpunkt.dev", name: "Dana Driver" },
};

/**
 * Dev-only: ensure a fixed developer account for the given role exists,
 * assign the role, and return credentials the browser can sign in with.
 * Uses the admin client so it works before anyone has an account.
 */
export const ensureDevUserFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ role: roleSchema }).parse(input))
  .handler(async ({ data }) => {
    const demoEnabled =
      process.env.NODE_ENV !== "production" && process.env.PARKPUNKT_ENABLE_DEMO_AUTH === "true";
    if (!demoEnabled) throw new Error("Demo authentication is disabled");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const p = PROFILE[data.role];

    // Find existing user by email
    const list = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (list.error) throw new Error(list.error.message);
    let user = list.data.users.find((u) => (u.email ?? "").toLowerCase() === p.email);

    if (!user) {
      const created = await supabaseAdmin.auth.admin.createUser({
        email: p.email,
        password: DEV_PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: p.name, dev: true },
      });
      if (created.error) throw new Error(created.error.message);
      user = created.data.user!;
    } else {
      // Ensure password is fresh so the client sign-in never fails.
      const updated = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: DEV_PASSWORD,
        email_confirm: true,
      });
      if (updated.error) throw new Error(updated.error.message);
    }

    // Ensure profile row exists (trigger normally handles it).
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: user.id, display_name: p.name }, { onConflict: "id" });
    if (profileError) throw new Error(profileError.message);

    // Assign role (driver = no user_roles entry — everyone can drive).
    if (data.role !== "driver") {
      let orgId: string | null = null;
      if (data.role === "operator" || data.role === "provider") {
        const { data: org, error: orgError } = await supabaseAdmin
          .from("orgs")
          .select("id")
          .eq("kind", data.role)
          .order("created_at")
          .limit(1)
          .maybeSingle();
        if (orgError || !org) throw new Error(`No ${data.role} organisation is configured`);
        orgId = org.id;
      }
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .upsert(
          { user_id: user.id, role: data.role, org_id: orgId },
          { onConflict: "user_id,role" },
        );
      if (roleError) throw new Error(roleError.message);
    }

    return { email: p.email, password: DEV_PASSWORD, name: p.name };
  });
