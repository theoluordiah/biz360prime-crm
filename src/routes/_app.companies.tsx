import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, canEdit } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/format";
import { Plus, X, Building2, Upload, Download, Pencil, Trash2 } from "lucide-react";
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
      owner_id: user!.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Company added");
    setOpenAdd(false);
    qc.invalidateQueries({ queryKey: ["companies-full"] });
  };

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl text-foreground" style={{ fontWeight: 500 }}>Companies</h1>
          <p className="text-sm text-muted-foreground mt-1">{companies.data?.length ?? 0} total</p>
        </div>
        {canEdit(role) && (
          <div className="flex gap-2">
            <button onClick={() => setOpenImport(true)} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-muted" style={{ fontWeight: 500 }}>
              <Upload className="h-4 w-4" /> Import
            </button>
            <button onClick={() => setOpenAdd(true)} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary-hover" style={{ fontWeight: 500 }}>
              <Plus className="h-4 w-4" /> Add company
            </button>
          </div>
        )}
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

function Field({ label, name, required = false }: { label: string; name: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>{label}{required && <span className="text-destructive"> *</span>}</label>
      <input name={name} required={required} maxLength={255} className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30" />
    </div>
  );
}
