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
  .inputValidator((input: unknown) => z.object({ role: roleSchema }).parse(input))
  .handler(async ({ data }) => {
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
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: DEV_PASSWORD,
        email_confirm: true,
      });
    }

    // Ensure profile row exists (trigger normally handles it).
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: user.id, display_name: p.name }, { onConflict: "id" });

    // Assign role (driver = no user_roles entry — everyone can drive).
    if (data.role !== "driver") {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: user.id, role: data.role }, { onConflict: "user_id,role" });
    }

    return { email: p.email, password: DEV_PASSWORD, name: p.name };
  });