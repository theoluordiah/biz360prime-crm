import { createFileRoute } from "@tanstack/react-router";
import { Mail, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_app/email-sync")({
  component: EmailSyncPage,
});

function EmailSyncPage() {
  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl text-foreground" style={{ fontWeight: 500 }}>Email Sync</h1>
        <p className="text-sm text-muted-foreground mt-1">Connect Gmail to sync conversations with your contacts.</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <div className="h-14 w-14 rounded-full bg-secondary/40 flex items-center justify-center mx-auto mb-4">
          <Mail className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-lg text-foreground mb-2" style={{ fontWeight: 500 }}>Connect your Gmail account</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
          Two-way sync auto-links emails to matching contacts. View threads in deal records and compose with AI from inside CRM360.
        </p>
        <button
          disabled
          className="rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground opacity-50 cursor-not-allowed"
          style={{ fontWeight: 500 }}
          title="Requires Google OAuth setup"
        >
          Connect Gmail
        </button>
        <p className="text-xs text-muted-foreground mt-4">
          Coming soon — requires Google Cloud OAuth credentials.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-base text-foreground mb-3" style={{ fontWeight: 500 }}>What you'll get</h3>
        <ul className="space-y-2 text-sm text-foreground/80">
          {[
            "Two-way email sync — emails auto-linked to matching contacts",
            "View full email threads inside contact and deal records",
            "Compose from within CRM using the AI Writer",
            "Email open tracking on messages sent via CRM",
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
