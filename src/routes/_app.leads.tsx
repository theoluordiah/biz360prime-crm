import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, canEdit } from "@/lib/auth-context";
import { formatDate } from "@/lib/format";
import { Plus, X, ArrowRight, Filter } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/leads")({
  component: LeadsPage,
});

const STATUS_BG: Record<string, string> = {
  new: "#fde2c0",
  contacted: "#ffe4d1",
  qualified: "#e0ecdc",
  converted: "#d4ead0",
  lost: "#e7e0d2",
};

const STATUSES = ["new", "contacted", "qualified", "converted", "lost"] as const;

function LeadsPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [openAdd, setOpenAdd] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const leads = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const all = leads.data ?? [];
    return filter === "all" ? all : all.filter((l: any) => l.status === filter);
  }, [leads.data, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: (leads.data ?? []).length };
    STATUSES.forEach((s) => { c[s] = (leads.data ?? []).filter((l: any) => l.status === s).length; });
    return c;
  }, [leads.data]);

  // Funnel — counts at each stage
  const funnel = STATUSES.map((s) => ({ stage: s, count: counts[s] ?? 0 }));
  const max = Math.max(...funnel.map((f) => f.count), 1);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("leads").update({ status: status as any }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["leads"] });
  };

  const addLead = async (form: FormData) => {
    const first = String(form.get("first_name") || "").trim();
    if (!first) { toast.error("First name required"); return; }
    const { error } = await supabase.from("leads").insert({
      first_name: first,
      last_name: String(form.get("last_name") || "").trim() || null,
      email: String(form.get("email") || "").trim() || null,
      phone: String(form.get("phone") || "").trim() || null,
      company_name: String(form.get("company_name") || "").trim() || null,
      source: String(form.get("source") || "").trim() || null,
      message: String(form.get("message") || "").trim() || null,
      owner_id: user!.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Lead added");
    setOpenAdd(false);
    qc.invalidateQueries({ queryKey: ["leads"] });
  };

  const convertToContact = async (lead: any) => {
    const { data: contact, error } = await supabase.from("contacts").insert({
      first_name: lead.first_name,
      last_name: lead.last_name ?? "—",
      email: lead.email,
      phone: lead.phone,
      role_title: null,
      owner_id: user!.id,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    await supabase.from("leads").update({ status: "converted", converted_contact_id: contact.id }).eq("id", lead.id);
    toast.success(`Converted to contact`);
    qc.invalidateQueries({ queryKey: ["leads"] });
  };

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl text-foreground" style={{ fontWeight: 500 }}>Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">Capture inbound prospects, qualify, and convert.</p>
        </div>
        {canEdit(role) && (
          <button onClick={() => setOpenAdd(true)} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary-hover" style={{ fontWeight: 500 }}>
            <Plus className="h-4 w-4" /> Add lead
          </button>
        )}
      </div>

      {/* Funnel */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm text-foreground mb-4" style={{ fontWeight: 500 }}>Conversion funnel</h2>
        <div className="space-y-2">
          {funnel.map((f) => (
            <div key={f.stage} className="flex items-center gap-3">
              <div className="w-24 text-xs text-muted-foreground capitalize" style={{ fontWeight: 500 }}>{f.stage}</div>
              <div className="flex-1 bg-muted/40 rounded-full h-7 overflow-hidden">
                <div
                  className="h-full rounded-full flex items-center px-3 text-xs text-foreground transition-all"
                  style={{ width: `${(f.count / max) * 100}%`, backgroundColor: STATUS_BG[f.stage], fontWeight: 500, minWidth: f.count > 0 ? "2.5rem" : "0" }}
                >
                  {f.count > 0 && f.count}
                </div>
              </div>
              <div className="w-10 text-right text-xs text-muted-foreground">{f.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <button
          onClick={() => setFilter("all")}
          className={`text-xs px-3 py-1.5 rounded-full ${filter === "all" ? "bg-foreground text-background" : "bg-card border border-border text-foreground"}`}
          style={{ fontWeight: 500 }}
        >
          All ({counts.all})
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full capitalize ${filter === s ? "ring-2 ring-secondary" : ""}`}
            style={{ backgroundColor: STATUS_BG[s], color: "var(--color-foreground)", fontWeight: 500 }}
          >
            {s} ({counts[s] ?? 0})
          </button>
        ))}
      </div>

      {/* Leads table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {filtered.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            No leads {filter !== "all" ? `with status "${filter}"` : "yet"}.
          </div>
        )}
        {filtered.map((l: any) => (
          <div key={l.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-foreground truncate" style={{ fontWeight: 500 }}>
                {l.first_name} {l.last_name ?? ""}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {l.email ?? "—"}{l.company_name ? ` · ${l.company_name}` : ""}{l.source ? ` · via ${l.source}` : ""}
              </div>
              {l.message && <div className="text-xs text-muted-foreground mt-1 italic line-clamp-1">"{l.message}"</div>}
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full capitalize" style={{ backgroundColor: STATUS_BG[l.status], color: "var(--color-foreground)" }}>
              {l.status}
            </span>
            {canEdit(role) && l.status !== "converted" && (
              <>
                <select
                  value={l.status}
                  onChange={(e) => updateStatus(l.id, e.target.value)}
                  className="text-xs rounded border border-input bg-input-bg px-2 py-1"
                  aria-label="Change status"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button
                  onClick={() => convertToContact(l)}
                  className="text-xs inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-foreground hover:bg-secondary-hover"
                  style={{ fontWeight: 500 }}
                  title="Convert to contact"
                >
                  Convert <ArrowRight className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {openAdd && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-foreground/20" onClick={() => setOpenAdd(false)} />
          <div className="w-full max-w-md bg-card h-full overflow-y-auto p-6 border-l border-border">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg text-foreground" style={{ fontWeight: 500 }}>Add lead</h2>
              <button onClick={() => setOpenAdd(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); addLead(new FormData(e.currentTarget)); }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name" name="first_name" required />
                <Field label="Last name" name="last_name" />
              </div>
              <Field label="Email" name="email" type="email" />
              <Field label="Phone" name="phone" />
              <Field label="Company" name="company_name" />
              <Field label="Source" name="source" placeholder="Website, LinkedIn, Referral..." />
              <div>
                <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>Message / context</label>
                <textarea name="message" rows={3} className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary" />
              </div>
              <button type="submit" className="w-full rounded-full bg-primary px-4 py-2.5 text-sm text-primary-foreground hover:bg-primary-hover" style={{ fontWeight: 500 }}>
                Save lead
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, name, type = "text", required = false, placeholder }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>{label}{required && <span className="text-destructive"> *</span>}</label>
      <input name={name} type={type} required={required} placeholder={placeholder} maxLength={255} className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30" />
    </div>
  );
}
