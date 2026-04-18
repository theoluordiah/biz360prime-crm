import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Settings as SettingsIcon, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { profile, role } = useAuth();
  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-5 w-5 text-primary" />
        <h1 className="text-2xl text-foreground" style={{ fontWeight: 500 }}>Settings</h1>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-base text-foreground mb-3" style={{ fontWeight: 500 }}>Your account</h2>
        <div className="space-y-2 text-sm">
          <Row label="Name" value={profile?.display_name} />
          <Row label="Email" value={profile?.email} />
          <Row label="Role" value={roleLabel(role)} />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-base text-foreground mb-1" style={{ fontWeight: 500 }}>Zoho CRM Integration</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Sync Contacts, Leads, Accounts and Deals with Zoho CRM via REST API v7.
        </p>
        <div className="rounded-lg bg-muted/40 border border-border p-4 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="text-foreground" style={{ fontWeight: 500 }}>Not connected</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sync mode</span>
            <span className="text-foreground" style={{ fontWeight: 500 }}>Bidirectional (planned)</span>
          </div>
        </div>
        <button
          disabled
          className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground opacity-50 cursor-not-allowed inline-flex items-center gap-2"
          style={{ fontWeight: 500 }}
        >
          Connect Zoho CRM <ExternalLink className="h-3.5 w-3.5" />
        </button>
        <p className="text-xs text-muted-foreground mt-3">
          Coming soon — requires Zoho OAuth app credentials and webhook endpoint setup.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-base text-foreground mb-3" style={{ fontWeight: 500 }}>Field mapping</h2>
        <div className="space-y-2 text-sm">
          <MapRow l="Zoho Lead" r="CRM360 Contact (Lead)" />
          <MapRow l="Zoho Account" r="CRM360 Company" />
          <MapRow l="Zoho Deal stages" r="CRM360 Pipeline columns" />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground" style={{ fontWeight: 500 }}>{value ?? "—"}</span>
    </div>
  );
}
function MapRow({ l, r }: { l: string; r: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 border border-border">
      <span className="text-foreground" style={{ fontWeight: 500 }}>{l}</span>
      <span className="text-muted-foreground">→</span>
      <span className="text-foreground" style={{ fontWeight: 500 }}>{r}</span>
    </div>
  );
}
function roleLabel(r: string | null): string {
  if (!r) return "—";
  return ({ admin: "Admin", sales_manager: "Sales Manager", sales_rep: "Sales Rep", viewer: "Viewer" } as Record<string, string>)[r] ?? r;
}
