import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, canEdit } from "@/lib/auth-context";
import { initials, timeAgo } from "@/lib/format";
import { TempBadge, Pill } from "@/components/Badge";
import { Plus, X, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import { ImportDialog, type ImportConfig } from "@/components/ImportDialog";

const CONTACTS_IMPORT: ImportConfig = {
  entity: "contacts",
  title: "Import contacts",
  fields: [
    { key: "first_name", label: "First name", required: true, transform: (v) => String(v ?? "").trim() },
    { key: "last_name", label: "Last name", required: true, transform: (v) => String(v ?? "").trim() },
    { key: "email", label: "Email", transform: (v) => String(v ?? "").trim() || null },
    { key: "phone", label: "Phone", transform: (v) => String(v ?? "").trim() || null },
    { key: "role_title", label: "Role / Title", transform: (v) => String(v ?? "").trim() || null },
    {
      key: "temperature",
      label: "Temperature (hot/warm/cold)",
      transform: (v) => {
        const s = String(v ?? "").trim().toLowerCase();
        return s === "hot" || s === "warm" || s === "cold" ? s : "warm";
      },
    },
  ],
  sampleRows: [
    { first_name: "Jane", last_name: "Doe", email: "jane@acme.com", phone: "+15551234", role_title: "CEO", temperature: "hot" },
    { first_name: "John", last_name: "Smith", email: "john@globex.com", phone: "", role_title: "VP Sales", temperature: "warm" },
  ],
};

export const Route = createFileRoute("/_app/contacts")({
  component: ContactsPage,
});

function ContactsPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [tempFilter, setTempFilter] = useState<"all" | "hot" | "warm" | "cold">("all");
  const [openAdd, setOpenAdd] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const contacts = useQuery({
    queryKey: ["contacts", search, tempFilter],
    queryFn: async () => {
      let q = supabase.from("contacts").select("*, companies(id, name)").order("created_at", { ascending: false });
      if (tempFilter !== "all") q = q.eq("temperature", tempFilter);
      const { data, error } = await q;
      if (error) throw error;
      const filtered = (data ?? []).filter((c: any) => {
        if (!search) return true;
        const s = search.toLowerCase();
        return `${c.first_name} ${c.last_name} ${c.email ?? ""} ${c.companies?.name ?? ""}`.toLowerCase().includes(s);
      });
      return filtered;
    },
  });

  const companies = useQuery({
    queryKey: ["companies-list"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name").order("name");
      return data ?? [];
    },
  });

  const addContact = async (form: FormData) => {
    const payload = {
      first_name: String(form.get("first_name") || "").trim(),
      last_name: String(form.get("last_name") || "").trim(),
      email: String(form.get("email") || "").trim() || null,
      phone: String(form.get("phone") || "").trim() || null,
      role_title: String(form.get("role_title") || "").trim() || null,
      company_id: String(form.get("company_id") || "") || null,
      temperature: (String(form.get("temperature") || "warm") as "hot" | "warm" | "cold"),
      owner_id: user!.id,
    };
    if (!payload.first_name || !payload.last_name) {
      toast.error("First and last name required");
      return;
    }
    const { error } = await supabase.from("contacts").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Contact added");
    setOpenAdd(false);
    qc.invalidateQueries({ queryKey: ["contacts"] });
  };

  const selected = contacts.data?.find((c: any) => c.id === selectedId);

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl text-foreground" style={{ fontWeight: 500 }}>Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">{contacts.data?.length ?? 0} total</p>
        </div>
        {canEdit(role) && (
          <button
            onClick={() => setOpenAdd(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary-hover"
            style={{ fontWeight: 500 }}
          >
            <Plus className="h-4 w-4" /> Add contact
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 rounded-full bg-search-bg px-4 py-2 border border-transparent focus-within:border-secondary flex-1 max-w-md">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, company..."
            className="bg-transparent flex-1 outline-none text-sm"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "hot", "warm", "cold"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTempFilter(t)}
              className={`px-3 py-1.5 text-xs rounded-full border ${
                tempFilter === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-foreground hover:bg-muted"
              }`}
              style={{ fontWeight: 500 }}
            >
              {t === "all" ? "All" : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {contacts.isLoading && (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="crm-skeleton h-12 w-full" />)}
          </div>
        )}
        {!contacts.isLoading && (contacts.data?.length ?? 0) === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            <div className="text-sm mb-3">No contacts yet</div>
            {canEdit(role) && (
              <button onClick={() => setOpenAdd(true)} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground" style={{ fontWeight: 500 }}>
                Add your first contact
              </button>
            )}
          </div>
        )}
        {!contacts.isLoading && (contacts.data?.length ?? 0) > 0 && (
          <ul className="divide-y divide-border">
            {contacts.data!.map((c: any) => (
              <li
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 cursor-pointer"
              >
                <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-xs text-foreground" style={{ fontWeight: 500 }}>
                  {initials(`${c.first_name} ${c.last_name}`)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground truncate" style={{ fontWeight: 500 }}>{c.first_name} {c.last_name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {c.role_title ?? "—"}{c.companies?.name ? ` · ${c.companies.name}` : ""}
                  </div>
                </div>
                <div className="hidden sm:block text-xs text-muted-foreground">{c.email}</div>
                <TempBadge temp={c.temperature} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Slide-in add panel */}
      {openAdd && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-foreground/20" onClick={() => setOpenAdd(false)} />
          <div className="w-full max-w-md bg-card h-full overflow-y-auto p-6 border-l border-border">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg text-foreground" style={{ fontWeight: 500 }}>Add contact</h2>
              <button onClick={() => setOpenAdd(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); addContact(new FormData(e.currentTarget)); }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name" name="first_name" required />
                <Field label="Last name" name="last_name" required />
              </div>
              <Field label="Email" name="email" type="email" />
              <Field label="Phone" name="phone" />
              <Field label="Role / Title" name="role_title" />
              <div>
                <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>Company</label>
                <select name="company_id" className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary">
                  <option value="">— None —</option>
                  {(companies.data ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>Temperature</label>
                <select name="temperature" defaultValue="warm" className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary">
                  <option value="hot">Hot</option>
                  <option value="warm">Warm</option>
                  <option value="cold">Cold</option>
                </select>
              </div>
              <button type="submit" className="w-full rounded-full bg-primary px-4 py-2.5 text-sm text-primary-foreground hover:bg-primary-hover" style={{ fontWeight: 500 }}>
                Save contact
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Slide-in detail */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-foreground/20" onClick={() => setSelectedId(null)} />
          <ContactDetail contact={selected} onClose={() => setSelectedId(null)} />
        </div>
      )}
    </div>
  );
}

function Field({ label, name, type = "text", required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>{label}{required && <span className="text-destructive"> *</span>}</label>
      <input
        name={name}
        type={type}
        required={required}
        maxLength={255}
        className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
      />
    </div>
  );
}

function ContactDetail({ contact, onClose }: { contact: any; onClose: () => void }) {
  const activities = useQuery({
    queryKey: ["activities", contact.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("*")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  return (
    <div className="w-full max-w-md bg-card h-full overflow-y-auto p-6 border-l border-border">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg text-foreground" style={{ fontWeight: 500 }}>Contact details</h2>
        <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
      </div>
      <div className="flex items-center gap-3 mb-5">
        <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center text-base text-foreground" style={{ fontWeight: 500 }}>
          {initials(`${contact.first_name} ${contact.last_name}`)}
        </div>
        <div>
          <div className="text-base text-foreground" style={{ fontWeight: 500 }}>{contact.first_name} {contact.last_name}</div>
          <div className="text-xs text-muted-foreground">{contact.role_title ?? ""}{contact.companies?.name ? ` · ${contact.companies.name}` : ""}</div>
          <div className="mt-1"><TempBadge temp={contact.temperature} /></div>
        </div>
      </div>

      <div className="space-y-2 mb-5 text-sm">
        <Row label="Email" value={contact.email} />
        <Row label="Phone" value={contact.phone} />
        <Row label="Tags" value={(contact.tags ?? []).length ? (contact.tags ?? []).join(", ") : "—"} />
        <Row label="Last contacted" value={contact.last_contacted_at ? timeAgo(contact.last_contacted_at) : "—"} />
      </div>

      <h3 className="text-sm text-foreground mb-3" style={{ fontWeight: 500 }}>Activity timeline</h3>
      {(activities.data ?? []).length === 0 ? (
        <div className="text-xs text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
          No activity yet
        </div>
      ) : (
        <ul className="space-y-3">
          {activities.data!.map((a: any) => (
            <li key={a.id} className="text-sm">
              <div className="flex items-center gap-2">
                <Pill tone="primary">{a.type}</Pill>
                <span className="text-xs text-muted-foreground">{timeAgo(a.created_at)}</span>
              </div>
              {a.content && <div className="text-foreground/80 mt-1 text-xs">{a.content}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground text-right truncate" style={{ fontWeight: 500 }}>{value || "—"}</span>
    </div>
  );
}
