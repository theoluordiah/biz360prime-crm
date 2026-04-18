import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Sparkles, Copy, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/ai-writer")({
  component: AIWriter,
});

const TONES = ["Friendly", "Professional", "Follow-up", "Cold outreach", "Thank you"] as const;
const LENGTHS = ["Short", "Medium", "Detailed"] as const;

function AIWriter() {
  const { user } = useAuth();
  const [contactId, setContactId] = useState<string>("");
  const [dealId, setDealId] = useState<string>("");
  const [tone, setTone] = useState<typeof TONES[number]>("Professional");
  const [length, setLength] = useState<typeof LENGTHS[number]>("Medium");
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  const contacts = useQuery({
    queryKey: ["contacts-min"],
    queryFn: async () => {
      const { data } = await supabase.from("contacts").select("id, first_name, last_name, companies(name)").order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  const deals = useQuery({
    queryKey: ["deals-min"],
    queryFn: async () => {
      const { data } = await supabase.from("deals").select("id, title, pipeline_stages(name)").order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  const generate = async () => {
    setLoading(true);
    setDraft("");
    try {
      const c = contacts.data?.find((x: any) => x.id === contactId);
      const d = deals.data?.find((x: any) => x.id === dealId);
      const { data, error } = await supabase.functions.invoke("ai-email-writer", {
        body: {
          contactName: c ? `${c.first_name} ${c.last_name}` : undefined,
          companyName: c?.companies?.name,
          dealStage: d?.pipeline_stages?.name,
          tone,
          length,
          customNotes: notes || undefined,
        },
      });
      if (error) {
        if (error.message?.includes("429")) toast.error("Rate limit reached. Try again in a moment.");
        else if (error.message?.includes("402")) toast.error("AI credits exhausted. Add credits in Workspace > Usage.");
        else toast.error(error.message || "Generation failed");
        return;
      }
      if ((data as any)?.error) {
        toast.error((data as any).error);
        return;
      }
      setDraft((data as any)?.text ?? "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (!draft.trim()) { toast.error("Nothing to save"); return; }
    const subjectMatch = draft.match(/^Subject:\s*(.+)$/m);
    const subject = subjectMatch?.[1]?.trim() ?? null;
    const body = draft.replace(/^Subject:\s*.+\n+/, "");
    const { error } = await supabase.from("email_templates").insert({
      name: subject?.slice(0, 80) ?? `${tone} template`,
      subject,
      body,
      tone,
      owner_id: user!.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Saved as template");
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-2xl text-foreground" style={{ fontWeight: 500 }}>AI Email Writer</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Context-aware drafts powered by AI. Edit before sending.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>Contact (optional)</label>
            <select value={contactId} onChange={(e) => setContactId(e.target.value)} className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary">
              <option value="">— Select —</option>
              {(contacts.data ?? []).map((c: any) => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}{c.companies?.name ? ` · ${c.companies.name}` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>Deal (optional)</label>
            <select value={dealId} onChange={(e) => setDealId(e.target.value)} className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary">
              <option value="">— Select —</option>
              {(deals.data ?? []).map((d: any) => (
                <option key={d.id} value={d.id}>{d.title}{d.pipeline_stages?.name ? ` · ${d.pipeline_stages.name}` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>Tone</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button key={t} onClick={() => setTone(t)} className={`px-3 py-1.5 text-xs rounded-full border ${tone === t ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:bg-muted"}`} style={{ fontWeight: 500 }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>Length</label>
            <div className="flex gap-2">
              {LENGTHS.map((l) => (
                <button key={l} onClick={() => setLength(l)} className={`flex-1 px-3 py-1.5 text-xs rounded-full border ${length === l ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:bg-muted"}`} style={{ fontWeight: 500 }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>Additional notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={500} placeholder="e.g. Mention the new pricing tier" className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30 resize-none" />
          </div>
          <button onClick={generate} disabled={loading} className="w-full rounded-full bg-primary px-4 py-2.5 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-60 inline-flex items-center justify-center gap-2" style={{ fontWeight: 500 }}>
            <Sparkles className="h-4 w-4" />
            {loading ? "Generating..." : "Generate draft"}
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base text-foreground" style={{ fontWeight: 500 }}>Draft</h2>
            <div className="flex gap-2">
              <button onClick={() => { navigator.clipboard.writeText(draft); toast.success("Copied"); }} disabled={!draft} className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
                <Copy className="h-3.5 w-3.5" /> Copy
              </button>
              <button onClick={saveTemplate} disabled={!draft} className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
                <Save className="h-3.5 w-3.5" /> Save template
              </button>
            </div>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={loading ? "Drafting..." : "Your AI-generated draft will appear here. Edit freely."}
            rows={20}
            className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30 resize-none font-sans leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}
