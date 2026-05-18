import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Mail, CheckCircle2, RefreshCw, UserPlus, Link as LinkIcon, AlertCircle } from "lucide-react";
import { fetchGmailMessages, type GmailMessage } from "@/lib/gmail.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, canEdit } from "@/lib/auth-context";
import { timeAgo } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/email-sync")({
  component: EmailSyncPage,
});

function EmailSyncPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const fetchMessages = useServerFn(fetchGmailMessages);

  const gmail = useQuery({
    queryKey: ["gmail-inbox"],
    queryFn: () => fetchMessages(),
    staleTime: 60_000,
  });

  const contacts = useQuery({
    queryKey: ["contacts-emails"],
    queryFn: async () => {
      const { data } = await supabase.from("contacts").select("id,first_name,last_name,email").not("email", "is", null);
      const map = new Map<string, { id: string; name: string }>();
      (data ?? []).forEach((c: any) => {
        if (c.email) map.set(String(c.email).toLowerCase(), { id: c.id, name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() });
      });
      return map;
    },
  });

  const createContact = async (m: GmailMessage) => {
    if (!user) return;
    const [first, ...rest] = (m.from.replace(/<[^>]+>/, "").trim() || m.fromEmail).split(" ");
    const { error } = await supabase.from("contacts").insert({
      first_name: first || m.fromEmail.split("@")[0],
      last_name: rest.join(" ") || "—",
      email: m.fromEmail,
      owner_id: user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Added ${m.fromEmail} to contacts`);
    qc.invalidateQueries({ queryKey: ["contacts-emails"] });
  };

  const isConnected = !gmail.isError;
  const messages = gmail.data?.messages ?? [];
  const linkedCount = messages.filter((m) => contacts.data?.has(m.fromEmail)).length;

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl text-foreground" style={{ fontWeight: 500 }}>Email Sync</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {gmail.data?.profileEmail
              ? <>Connected to <span className="text-foreground" style={{ fontWeight: 500 }}>{gmail.data.profileEmail}</span></>
              : "Gmail integration"}
          </p>
        </div>
        <button
          onClick={() => gmail.refetch()}
          disabled={gmail.isFetching}
          className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm text-foreground hover:bg-secondary-hover disabled:opacity-50"
          style={{ fontWeight: 500 }}
        >
          <RefreshCw className={`h-4 w-4 ${gmail.isFetching ? "animate-spin" : ""}`} />
          {gmail.isFetching ? "Syncing…" : "Sync now"}
        </button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label="Status"
          value={isConnected ? "Active" : "Error"}
          icon={isConnected ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
        />
        <StatCard label="Messages synced" value={String(messages.length)} icon={<Mail className="h-4 w-4 text-primary" />} />
        <StatCard label="Linked to contacts" value={`${linkedCount} / ${messages.length}`} icon={<LinkIcon className="h-4 w-4 text-primary" />} />
      </div>

      {gmail.isError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {(gmail.error as Error).message}
        </div>
      )}

      {/* Messages */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-base text-foreground" style={{ fontWeight: 500 }}>Recent inbox</h2>
          <span className="text-xs text-muted-foreground">Last 25 messages</span>
        </div>

        {gmail.isLoading ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">Loading Gmail messages…</div>
        ) : messages.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">No messages.</div>
        ) : (
          <div className="divide-y divide-border">
            {messages.map((m) => {
              const linked = contacts.data?.get(m.fromEmail);
              return (
                <div key={m.id} className={`px-4 py-3 hover:bg-muted/30 ${m.unread ? "bg-primary/5" : ""}`}>
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground truncate" style={{ fontWeight: m.unread ? 600 : 500 }}>
                          {m.from || m.fromEmail}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(m.date)}</span>
                      </div>
                      <div className="text-sm text-foreground/80 truncate">{m.subject}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{m.snippet}</div>
                    </div>
                    {linked ? (
                      <span className="text-[10px] inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-1 shrink-0" style={{ fontWeight: 500 }}>
                        <LinkIcon className="h-3 w-3" /> {linked.name || "Linked"}
                      </span>
                    ) : canEdit(role) && m.fromEmail ? (
                      <button
                        onClick={() => createContact(m)}
                        className="text-[10px] inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-foreground hover:bg-secondary-hover shrink-0"
                        style={{ fontWeight: 500 }}
                      >
                        <UserPlus className="h-3 w-3" /> Add contact
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-base text-foreground mb-3" style={{ fontWeight: 500 }}>What's active</h3>
        <ul className="space-y-2 text-sm text-foreground/80">
          {[
            "Live read of the connected Gmail inbox",
            "Automatic linking of senders to existing CRM contacts by email",
            "One-click conversion of unknown senders into new contacts",
            "Manual sync to refresh on demand",
          ].map((f) => (
            <li key={f} className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="text-xl text-foreground mt-1" style={{ fontWeight: 500 }}>{value}</div>
    </div>
  );
}
