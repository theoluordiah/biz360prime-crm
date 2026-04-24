import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, canEdit } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/format";
import { Plus, X, Building2, Upload, Download, Pencil, Trash2, Eye, Mail, Phone, MapPin, User, Globe } from "lucide-react";
import { toast } from "sonner";
import { ImportDialog, type ImportConfig } from "@/components/ImportDialog";
import { exportToCsv } from "@/lib/csv-export";

const COMPANIES_IMPORT: ImportConfig = {
  entity: "companies",
  title: "Import companies",
  fields: [
    { key: "name", label: "Company name", required: true, transform: (v) => String(v ?? "").trim() },
    { key: "industry", label: "Industry", transform: (v) => String(v ?? "").trim() || null },
    { key: "website", label: "Website", transform: (v) => String(v ?? "").trim() || null },
    { key: "notes", label: "Notes", transform: (v) => String(v ?? "").trim() || null },
  ],
  sampleRows: [
    { name: "Acme Inc", industry: "Software", website: "https://acme.com", notes: "Key account" },
    { name: "Globex", industry: "Manufacturing", website: "https://globex.com", notes: "" },
  ],
};

export const Route = createFileRoute("/_app/companies")({
  component: CompaniesPage,
});

function CompaniesPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [openAdd, setOpenAdd] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [viewing, setViewing] = useState<any | null>(null);
  const canDelete = role === "admin" || role === "sales_manager";

  const companies = useQuery({
    queryKey: ["companies-full"],
    queryFn: async () => {
      const { data: comps } = await supabase.from("companies").select("*").order("name");
      const { data: contacts } = await supabase.from("contacts").select("id, company_id");
      const { data: deals } = await supabase.from("deals").select("id, value, company_id");
      return (comps ?? []).map((c: any) => {
        const myContacts = (contacts ?? []).filter((x: any) => x.company_id === c.id);
        const myDeals = (deals ?? []).filter((x: any) => x.company_id === c.id);
        return {
          ...c,
          contact_count: myContacts.length,
          deal_count: myDeals.length,
          revenue: myDeals.reduce((s: number, d: any) => s + Number(d.value || 0), 0),
        };
      });
    },
  });

  const addCompany = async (form: FormData) => {
    const name = String(form.get("name") || "").trim();
    if (!name) { toast.error("Name required"); return; }
    const { error } = await supabase.from("companies").insert({
      name,
      industry: String(form.get("industry") || "").trim() || null,
      website: String(form.get("website") || "").trim() || null,
      contact_person: String(form.get("contact_person") || "").trim() || null,
      email: String(form.get("email") || "").trim() || null,
      phone: String(form.get("phone") || "").trim() || null,
      address: String(form.get("address") || "").trim() || null,
      owner_id: user!.id,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Company added");
    setOpenAdd(false);
    qc.invalidateQueries({ queryKey: ["companies-full"] });
  };

  const updateCompany = async (id: string, form: FormData) => {
    const name = String(form.get("name") || "").trim();
    if (!name) { toast.error("Name required"); return; }
    const { error } = await supabase.from("companies").update({
      name,
      industry: String(form.get("industry") || "").trim() || null,
      website: String(form.get("website") || "").trim() || null,
      contact_person: String(form.get("contact_person") || "").trim() || null,
      email: String(form.get("email") || "").trim() || null,
      phone: String(form.get("phone") || "").trim() || null,
      address: String(form.get("address") || "").trim() || null,
    } as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Company updated");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["companies-full"] });
  };

  const deleteCompany = async (id: string) => {
    if (!confirm("Delete this company? Linked contacts and deals will be detached.")) return;
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Company deleted");
    qc.invalidateQueries({ queryKey: ["companies-full"] });
  };

  const exportCompanies = () => {
    const rows = (companies.data ?? []).map((c: any) => ({
      name: c.name,
      industry: c.industry ?? "",
      website: c.website ?? "",
      notes: c.notes ?? "",
      contact_count: c.contact_count,
      deal_count: c.deal_count,
      revenue: c.revenue,
      created_at: c.created_at,
    }));
    if (!rows.length) { toast.error("Nothing to export"); return; }
    exportToCsv(`companies-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast.success(`Exported ${rows.length} companies`);
  };

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl text-foreground" style={{ fontWeight: 500 }}>Companies</h1>
            {role && (
              <span
                title={canEdit(role) ? "You can add and edit companies" : "Read-only access"}
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs border ${
                  canEdit(role)
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-muted text-muted-foreground border-border"
                }`}
                style={{ fontWeight: 500 }}
              >
                {role.replace("_", " ")}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {companies.data?.length ?? 0} total · {canEdit(role) ? (canDelete ? "can edit & delete" : "can edit") : "view only"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportCompanies} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-muted" style={{ fontWeight: 500 }}>
            <Download className="h-4 w-4" /> Export
          </button>
          {canEdit(role) && (
            <>
              <button onClick={() => setOpenImport(true)} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-muted" style={{ fontWeight: 500 }}>
                <Upload className="h-4 w-4" /> Import
              </button>
              <button onClick={() => setOpenAdd(true)} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary-hover" style={{ fontWeight: 500 }}>
                <Plus className="h-4 w-4" /> Add company
              </button>
            </>
          )}
        </div>
      </div>

      {(companies.data?.length ?? 0) === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          <Building2 className="h-10 w-10 mx-auto mb-3 text-secondary" />
          <div className="text-sm mb-4">No companies yet</div>
          {canEdit(role) && (
            <button onClick={() => setOpenAdd(true)} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground" style={{ fontWeight: 500 }}>
              Add your first company
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(companies.data ?? []).map((c: any) => (
            <div key={c.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-foreground" style={{ fontWeight: 500 }}>
                  {c.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base text-foreground truncate" style={{ fontWeight: 500 }}>{c.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.industry || c.website || "—"}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setViewing(c)} title="View" className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                    <Eye className="h-4 w-4" />
                  </button>
                  {canEdit(role) && (
                    <button onClick={() => setEditing(c)} title="Edit" className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  {canEdit(role) && canDelete && (
                    <button onClick={() => deleteCompany(c.id)} title="Delete" className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
                <Stat label="Contacts" value={c.contact_count} />
                <Stat label="Deals" value={c.deal_count} />
                <Stat label="Revenue" value={formatCurrency(c.revenue)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-foreground/20" onClick={() => setViewing(null)} />
          <div className="w-full max-w-md bg-card h-full overflow-y-auto p-6 border-l border-border">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg text-foreground" style={{ fontWeight: 500 }}>Company details</h2>
              <button onClick={() => setViewing(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-border">
              <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center text-foreground text-lg" style={{ fontWeight: 500 }}>
                {viewing.name[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-base text-foreground truncate" style={{ fontWeight: 500 }}>{viewing.name}</div>
                <div className="text-xs text-muted-foreground truncate">{viewing.industry || "—"}</div>
              </div>
            </div>
            <div className="space-y-3">
              <DetailRow icon={User} label="Contact person" value={viewing.contact_person} />
              <DetailRow icon={Mail} label="Email address" value={viewing.email} isEmail />
              <DetailRow icon={Phone} label="Phone" value={viewing.phone} isPhone />
              <DetailRow icon={MapPin} label="Company address" value={viewing.address} />
              <DetailRow icon={Globe} label="Website" value={viewing.website} isLink />
              <DetailRow icon={Building2} label="Industry" value={viewing.industry} />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-5 pt-5 border-t border-border">
              <Stat label="Contacts" value={viewing.contact_count} />
              <Stat label="Deals" value={viewing.deal_count} />
              <Stat label="Revenue" value={formatCurrency(viewing.revenue)} />
            </div>
            {viewing.notes && (
              <div className="mt-5 pt-5 border-t border-border">
                <div className="text-xs text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>Notes</div>
                <div className="text-sm text-foreground whitespace-pre-wrap">{viewing.notes}</div>
              </div>
            )}
            {canEdit(role) && (
              <button
                onClick={() => { setEditing(viewing); setViewing(null); }}
                className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm text-primary-foreground hover:bg-primary-hover"
                style={{ fontWeight: 500 }}
              >
                <Pencil className="h-4 w-4" /> Edit company
              </button>
            )}
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-foreground/20" onClick={() => setEditing(null)} />
          <div className="w-full max-w-md bg-card h-full overflow-y-auto p-6 border-l border-border">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg text-foreground" style={{ fontWeight: 500 }}>Edit company</h2>
              <button onClick={() => setEditing(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); updateCompany(editing.id, new FormData(e.currentTarget)); }} className="space-y-3">
              <Field label="Company name" name="name" required defaultValue={editing.name} />
              <Field label="Industry" name="industry" defaultValue={editing.industry ?? ""} />
              <Field label="Website" name="website" defaultValue={editing.website ?? ""} />
              <Field label="Contact person" name="contact_person" defaultValue={editing.contact_person ?? ""} />
              <Field label="Email address" name="email" type="email" defaultValue={editing.email ?? ""} />
              <Field label="Phone" name="phone" defaultValue={editing.phone ?? ""} />
              <div>
                <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>Company address</label>
                <textarea name="address" rows={2} defaultValue={editing.address ?? ""} className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30" />
              </div>
              <button type="submit" className="w-full rounded-full bg-primary px-4 py-2.5 text-sm text-primary-foreground hover:bg-primary-hover" style={{ fontWeight: 500 }}>
                Save changes
              </button>
            </form>
          </div>
        </div>
      )}

      {openAdd && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-foreground/20" onClick={() => setOpenAdd(false)} />
          <div className="w-full max-w-md bg-card h-full overflow-y-auto p-6 border-l border-border">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg text-foreground" style={{ fontWeight: 500 }}>Add company</h2>
              <button onClick={() => setOpenAdd(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); addCompany(new FormData(e.currentTarget)); }} className="space-y-3">
              <Field label="Company name" name="name" required />
              <Field label="Industry" name="industry" />
              <Field label="Website" name="website" />
              <Field label="Contact person" name="contact_person" />
              <Field label="Email address" name="email" type="email" />
              <Field label="Phone" name="phone" />
              <div>
                <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>Company address</label>
                <textarea name="address" rows={2} className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30" />
              </div>
              <button type="submit" className="w-full rounded-full bg-primary px-4 py-2.5 text-sm text-primary-foreground hover:bg-primary-hover" style={{ fontWeight: 500 }}>
                Save company
              </button>
            </form>
          </div>
        </div>
      )}

      {openImport && (
        <ImportDialog
          config={COMPANIES_IMPORT}
          onClose={() => setOpenImport(false)}
          onImported={() => qc.invalidateQueries({ queryKey: ["companies-full"] })}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground" style={{ fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function Field({ label, name, required = false, defaultValue, type = "text" }: { label: string; name: string; required?: boolean; defaultValue?: string; type?: string }) {
  return (
    <div>
      <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>{label}{required && <span className="text-destructive"> *</span>}</label>
      <input name={name} type={type} required={required} defaultValue={defaultValue} maxLength={255} className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30" />
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, isEmail, isPhone, isLink }: { icon: any; label: string; value?: string | null; isEmail?: boolean; isPhone?: boolean; isLink?: boolean }) {
  const display = value && String(value).trim() ? String(value) : "—";
  const hasValue = display !== "—";
  let href: string | undefined;
  if (hasValue) {
    if (isEmail) href = `mailto:${display}`;
    else if (isPhone) href = `tel:${display}`;
    else if (isLink) href = display.startsWith("http") ? display : `https://${display}`;
  }
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        {href ? (
          <a href={href} target={isLink ? "_blank" : undefined} rel="noreferrer" className="text-sm text-foreground hover:text-primary break-words" style={{ fontWeight: 500 }}>{display}</a>
        ) : (
          <div className="text-sm text-foreground break-words" style={{ fontWeight: 500 }}>{display}</div>
        )}
      </div>
    </div>
  );
}
