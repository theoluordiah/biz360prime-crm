import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ChangeEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, canEdit } from "@/lib/auth-context";
import { formatDate } from "@/lib/format";
import { Upload, FileText, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/documents")({
  component: DocumentsPage,
});

function DocumentsPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const docs = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("*, deals(title), contacts(first_name, last_name), companies(name)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const deals = useQuery({
    queryKey: ["deals-light"],
    queryFn: async () => {
      const { data } = await supabase.from("deals").select("id, title");
      return data ?? [];
    },
  });

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 25 * 1024 * 1024) { toast.error("File too large (max 25 MB)"); return; }
    setUploading(true);
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { error: dbErr } = await supabase.from("documents").insert({
      name: file.name,
      storage_path: path,
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: user.id,
    });
    if (dbErr) { toast.error(dbErr.message); }
    else { toast.success("Uploaded"); qc.invalidateQueries({ queryKey: ["documents"] }); }
    setUploading(false);
    e.target.value = "";
  };

  const download = async (d: any) => {
    const { data } = await supabase.storage.from("documents").createSignedUrl(d.storage_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const remove = async (d: any) => {
    if (!confirm(`Delete "${d.name}"?`)) return;
    await supabase.storage.from("documents").remove([d.storage_path]);
    await supabase.from("documents").delete().eq("id", d.id);
    qc.invalidateQueries({ queryKey: ["documents"] });
  };

  const fmtSize = (n: number) => {
    if (!n) return "—";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl text-foreground" style={{ fontWeight: 500 }}>Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">Proposals, contracts, and files attached to your deals.</p>
        </div>
        {canEdit(role) && (
          <label className={`inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary-hover cursor-pointer ${uploading ? "opacity-50" : ""}`} style={{ fontWeight: 500 }}>
            <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload file"}
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {(docs.data ?? []).length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            No documents yet — upload your first proposal or contract.
          </div>
        )}
        {(docs.data ?? []).map((d: any) => (
          <div key={d.id} className="flex items-center gap-3 px-4 py-3">
            <div className="h-10 w-10 rounded-lg bg-secondary/40 flex items-center justify-center">
              <FileText className="h-5 w-5 text-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-foreground truncate" style={{ fontWeight: 500 }}>{d.name}</div>
              <div className="text-xs text-muted-foreground">
                {fmtSize(d.size_bytes)} · {formatDate(d.created_at)}
                {d.deals?.title && ` · ${d.deals.title}`}
              </div>
            </div>
            <button onClick={() => download(d)} className="text-muted-foreground hover:text-foreground p-2" aria-label="Download">
              <Download className="h-4 w-4" />
            </button>
            {(d.uploaded_by === user?.id || role === "admin" || role === "sales_manager") && (
              <button onClick={() => remove(d)} className="text-muted-foreground hover:text-destructive p-2" aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
