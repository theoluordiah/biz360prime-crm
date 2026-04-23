// Admin staff management edge function
// Allows admins to invite, edit profile, and remove staff via service role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    // Verify caller is admin
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden — admin only" }, 403);

    const body = await req.json();
    const action = body.action as "invite" | "update" | "remove";

    if (action === "invite") {
      const { email, display_name, role } = body;
      if (!email || !display_name || !role) return json({ error: "Missing fields" }, 400);

      // Create user with a temporary password; user resets via "forgot password"
      const tempPassword = crypto.randomUUID() + "Aa1!";
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { display_name },
      });
      if (createErr || !created.user) return json({ error: createErr?.message ?? "Create failed" }, 400);

      // Profile + default role are created via handle_new_user trigger.
      // Replace role with chosen role.
      await admin.from("user_roles").delete().eq("user_id", created.user.id);
      const { error: roleErr } = await admin.from("user_roles").insert({ user_id: created.user.id, role });
      if (roleErr) return json({ error: roleErr.message }, 400);

      // Send password reset so user can set their own password
      await admin.auth.admin.generateLink({ type: "recovery", email });

      return json({ ok: true, user_id: created.user.id, temp_password: tempPassword });
    }

    if (action === "update") {
      const { user_id, display_name, email } = body;
      if (!user_id) return json({ error: "Missing user_id" }, 400);

      if (email) {
        const { error: e } = await admin.auth.admin.updateUserById(user_id, { email });
        if (e) return json({ error: e.message }, 400);
      }
      if (display_name !== undefined || email !== undefined) {
        const update: Record<string, unknown> = {};
        if (display_name !== undefined) update.display_name = display_name;
        if (email !== undefined) update.email = email;
        const { error: e } = await admin.from("profiles").update(update).eq("id", user_id);
        if (e) return json({ error: e.message }, 400);
      }
      return json({ ok: true });
    }

    if (action === "remove") {
      const { user_id } = body;
      if (!user_id) return json({ error: "Missing user_id" }, 400);
      if (user_id === userData.user.id) return json({ error: "You cannot remove yourself" }, 400);

      // Delete role rows first (FK-safe)
      await admin.from("user_roles").delete().eq("user_id", user_id);
      await admin.from("stage_assignees").delete().eq("user_id", user_id);
      await admin.from("task_assignees").delete().eq("user_id", user_id);
      // Delete auth user — profile cascades via handle_new_user? profiles has no FK; clean it
      await admin.from("profiles").delete().eq("id", user_id);
      const { error: delErr } = await admin.auth.admin.deleteUser(user_id);
      if (delErr) return json({ error: delErr.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
