import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, isAdmin, type AppRole } from "@/lib/auth-context";
import { initials, formatDate } from "@/lib/format";
import { Shield, Lock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/roles")({
  component: RolesPage,
});

const ROLES: AppRole[] = ["admin", "sales_manager", "sales_rep", "viewer"];

function RolesPage() {
  const { role: myRole } = useAuth();
  const qc = useQueryClient();
  const [pending, setPending] = useState<{ user: any; newRole: AppRole } | null>(null);
  const [saving, setSaving] = useState(false);

  const users = useQuery({
    queryKey: ["users-roles"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at");
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const map: Record<string, AppRole> = {};
      (roles ?? []).forEach((r: any) => {
        const cur = map[r.user_id];
        const priority: Record<AppRole, number> = { admin: 1, sales_manager: 2, sales_rep: 3, viewer: 4 };
        if (!cur || priority[r.role as AppRole] < priority[cur]) map[r.user_id] = r.role;
      });
      return (profiles ?? []).map((p: any) => ({ ...p, role: map[p.id] ?? "viewer" }));
    },
    enabled: isAdmin(myRole),
  });

  const requestRoleChange = (user: any, newRole: AppRole) => {
    if (newRole === user.role) return;
    setPending({ user, newRole });
  };

  const confirmRoleChange = async () => {
    if (!pending) return;
    setSaving(true);
    const { user, newRole } = pending;
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", user.id);
    if (delErr) { toast.error(delErr.message); setSaving(false); return; }
    const { error: insErr } = await supabase.from("user_roles").insert({ user_id: user.id, role: newRole });
    if (insErr) { toast.error(insErr.message); setSaving(false); return; }
    toast.success(`${user.display_name} is now ${roleLabel(newRole)}`);
    qc.invalidateQueries({ queryKey: ["users-roles"] });
    setSaving(false);
    setPending(null);
  };

  if (!isAdmin(myRole)) {
    return (
      <div className="max-w-md mx-auto mt-20 bg-card border border-border rounded-xl p-8 text-center">
        <Lock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h2 className="text-lg text-foreground" style={{ fontWeight: 500 }}>Admin only</h2>
        <p className="text-sm text-muted-foreground mt-2">Only workspace admins can manage roles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="text-2xl text-foreground" style={{ fontWeight: 500 }}>Roles & Access</h1>
      </div>
      <p className="text-sm text-muted-foreground -mt-3">
        Manage who can view and edit data across the workspace.
      </p>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="text-left px-5 py-3 text-xs text-muted-foreground" style={{ fontWeight: 500 }}>Member</th>
              <th className="text-left px-5 py-3 text-xs text-muted-foreground" style={{ fontWeight: 500 }}>Joined</th>
              <th className="text-left px-5 py-3 text-xs text-muted-foreground" style={{ fontWeight: 500 }}>Role</th>
            </tr>
          </thead>
          <tbody>
            {(users.data ?? []).map((u: any) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs text-foreground" style={{ fontWeight: 500 }}>
                      {initials(u.display_name)}
                    </div>
                    <div>
                      <div className="text-foreground" style={{ fontWeight: 500 }}>{u.display_name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-muted-foreground text-xs">{formatDate(u.created_at)}</td>
                <td className="px-5 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => requestRoleChange(u, e.target.value as AppRole)}
                    className="rounded-lg border border-input bg-input-bg px-3 py-1.5 text-sm outline-none focus:border-secondary"
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-base text-foreground mb-3" style={{ fontWeight: 500 }}>Role permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {[
            { r: "Admin", d: "Full access — manage users, billing, and all data." },
            { r: "Sales Manager", d: "View/edit all deals & contacts, assign leads, run reports." },
            { r: "Sales Rep", d: "View & edit only contacts and deals they own." },
            { r: "Viewer", d: "Read-only access across all modules." },
          ].map((p) => (
            <div key={p.r} className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-foreground" style={{ fontWeight: 500 }}>{p.r}</div>
              <div className="text-xs text-muted-foreground mt-1">{p.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation modal */}
      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={() => !saving && setPending(null)}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${pending.newRole === "admin" ? "bg-destructive/10" : "bg-primary/10"}`}>
                <AlertTriangle className={`h-5 w-5 ${pending.newRole === "admin" ? "text-destructive" : "text-primary"}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-base text-foreground" style={{ fontWeight: 500 }}>
                  {pending.newRole === "admin" ? "Grant Admin access?" : "Change role?"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1.5">
                  You're changing <span className="text-foreground" style={{ fontWeight: 500 }}>{pending.user.display_name}</span> from{" "}
                  <span className="text-foreground">{roleLabel(pending.user.role)}</span> to{" "}
                  <span className="text-foreground" style={{ fontWeight: 500 }}>{roleLabel(pending.newRole)}</span>.
                </p>
                {pending.newRole === "admin" && (
                  <p className="text-xs text-destructive mt-2">
                    Admins have full access — they can manage users, billing, and all data.
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                disabled={saving}
                onClick={() => setPending(null)}
                className="rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-60"
                style={{ fontWeight: 500 }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={confirmRoleChange}
                className={`rounded-full px-4 py-2 text-sm transition-colors disabled:opacity-60 ${pending.newRole === "admin" ? "bg-destructive text-destructive-foreground hover:opacity-90" : "bg-primary text-primary-foreground hover:bg-primary-hover"}`}
                style={{ fontWeight: 500 }}
              >
                {saving ? "Saving..." : pending.newRole === "admin" ? "Yes, grant Admin" : "Confirm change"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function roleLabel(r: AppRole): string {
  return ({ admin: "Admin", sales_manager: "Sales Manager", sales_rep: "Sales Rep", viewer: "Viewer" } as const)[r];
}
