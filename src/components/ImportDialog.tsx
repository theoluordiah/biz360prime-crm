import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { X, Upload, FileSpreadsheet, Check, AlertCircle, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export type ImportFieldDef = {
  key: string;
  label: string;
  required?: boolean;
  /** transform raw cell value before insert */
  transform?: (val: any, row: Record<string, any>) => any;
};

export type ImportConfig = {
  entity: "contacts" | "companies";
  title: string;
  fields: ImportFieldDef[];
  /** sample CSV header + one row */
  sampleRows: Record<string, string>[];
};

type Step = "upload" | "map" | "preview" | "done";

export function ImportDialog({
  config,
  onClose,
  onImported,
}: {
  config: ImportConfig;
  onClose: () => void;
  onImported: () => void;
}) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({}); // fieldKey -> sourceHeader
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; failed: number; errors: string[] }>({ inserted: 0, failed: 0, errors: [] });

  const handleFile = async (file: File) => {
    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let parsedRows: Record<string, any>[] = [];

      if (ext === "csv" || file.type === "text/csv") {
        const text = await file.text();
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
        parsedRows = result.data as Record<string, any>[];
      } else if (ext === "xlsx" || ext === "xls") {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        parsedRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
      } else {
        toast.error("Unsupported file. Use .csv, .xlsx, or .xls");
        return;
      }

      if (parsedRows.length === 0) {
        toast.error("File is empty");
        return;
      }

      const hdrs = Object.keys(parsedRows[0]);
      setHeaders(hdrs);
      setRows(parsedRows);

      // Auto-map by lowercased name match
      const auto: Record<string, string> = {};
      for (const f of config.fields) {
        const match = hdrs.find(
          (h) =>
            h.toLowerCase().replace(/[\s_-]/g, "") === f.key.toLowerCase().replace(/[\s_-]/g, "") ||
            h.toLowerCase() === f.label.toLowerCase()
        );
        if (match) auto[f.key] = match;
      }
      setMapping(auto);
      setStep("map");
    } catch (e: any) {
      toast.error(`Failed to parse file: ${e.message}`);
    }
  };

  const downloadSample = () => {
    const csv = Papa.unparse(config.sampleRows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.entity}-sample.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const previewRows = rows.slice(0, 5);

  const validateMapping = () => {
    for (const f of config.fields) {
      if (f.required && !mapping[f.key]) {
        toast.error(`Map a column for "${f.label}"`);
        return false;
      }
    }
    return true;
  };

  const runImport = async () => {
    if (!validateMapping() || !user) return;
    setImporting(true);
    const errors: string[] = [];
    let inserted = 0;
    let failed = 0;

    const payloads: any[] = [];
    rows.forEach((row, idx) => {
      const obj: Record<string, any> = { owner_id: user.id };
      let rowOk = true;
      for (const f of config.fields) {
        const src = mapping[f.key];
        if (!src) continue;
        const raw = row[src];
        const val = f.transform ? f.transform(raw, row) : (raw === "" ? null : raw);
        if (f.required && (val === null || val === undefined || val === "")) {
          errors.push(`Row ${idx + 2}: missing ${f.label}`);
          failed++;
          rowOk = false;
          break;
        }
        obj[f.key] = val;
      }
      if (rowOk) payloads.push(obj);
    });

    // Batch insert in chunks of 100
    for (let i = 0; i < payloads.length; i += 100) {
      const chunk = payloads.slice(i, i + 100);
      const { error, count } = await supabase
        .from(config.entity)
        .insert(chunk, { count: "exact" });
      if (error) {
        failed += chunk.length;
        errors.push(`Batch ${Math.floor(i / 100) + 1}: ${error.message}`);
      } else {
        inserted += count ?? chunk.length;
      }
    }

    setResult({ inserted, failed, errors: errors.slice(0, 10) });
    setStep("done");
    setImporting(false);
    if (inserted > 0) {
      toast.success(`Imported ${inserted} ${config.entity}`);
      onImported();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-foreground/20" onClick={onClose} />
      <div className="w-full max-w-xl bg-card h-full overflow-y-auto p-6 border-l border-border">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg text-foreground" style={{ fontWeight: 500 }}>{config.title}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-6 text-xs">
          {(["upload", "map", "preview", "done"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center ${step === s ? "bg-primary text-primary-foreground" : (["upload", "map", "preview", "done"].indexOf(step) > i ? "bg-secondary text-foreground" : "bg-muted text-muted-foreground")}`} style={{ fontWeight: 500 }}>
                {i + 1}
              </div>
              <span className="capitalize text-muted-foreground">{s}</span>
              {i < 3 && <span className="text-muted-foreground">→</span>}
            </div>
          ))}
        </div>

        {step === "upload" && (
          <div className="space-y-4">
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:bg-muted/40 transition-colors"
            >
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <div className="text-sm text-foreground mb-1" style={{ fontWeight: 500 }}>Click to upload</div>
              <div className="text-xs text-muted-foreground">CSV, XLSX, or XLS (first row = headers)</div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
            <button
              onClick={downloadSample}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground hover:bg-muted"
              style={{ fontWeight: 500 }}
            >
              <Download className="h-4 w-4" /> Download sample CSV template
            </button>
            <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
              <div style={{ fontWeight: 500 }} className="text-foreground mb-1">Expected columns:</div>
              {config.fields.map((f) => (
                <div key={f.key}>• {f.label}{f.required && <span className="text-destructive"> *</span>}</div>
              ))}
            </div>
          </div>
        )}

        {step === "map" && (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground">
              <FileSpreadsheet className="h-4 w-4 inline mr-1" />
              {rows.length} rows detected. Match your file's columns to fields:
            </div>
            <div className="space-y-3">
              {config.fields.map((f) => (
                <div key={f.key} className="grid grid-cols-2 gap-3 items-center">
                  <label className="text-sm text-foreground" style={{ fontWeight: 500 }}>
                    {f.label}{f.required && <span className="text-destructive"> *</span>}
                  </label>
                  <select
                    value={mapping[f.key] || ""}
                    onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
                    className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary"
                  >
                    <option value="">— Skip —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setStep("upload")} className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm text-foreground hover:bg-muted" style={{ fontWeight: 500 }}>
                Back
              </button>
              <button
                onClick={() => { if (validateMapping()) setStep("preview"); }}
                className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm text-primary-foreground hover:bg-primary-hover"
                style={{ fontWeight: 500 }}
              >
                Preview
              </button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground">
              Showing first {previewRows.length} of {rows.length} rows:
            </div>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    {config.fields.filter((f) => mapping[f.key]).map((f) => (
                      <th key={f.key} className="px-3 py-2 text-left text-foreground" style={{ fontWeight: 500 }}>{f.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      {config.fields.filter((f) => mapping[f.key]).map((f) => {
                        const raw = r[mapping[f.key]];
                        const v = f.transform ? f.transform(raw, r) : raw;
                        return <td key={f.key} className="px-3 py-2 text-foreground/80 truncate max-w-[150px]">{String(v ?? "—")}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep("map")} disabled={importing} className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm text-foreground hover:bg-muted disabled:opacity-50" style={{ fontWeight: 500 }}>
                Back
              </button>
              <button
                onClick={runImport}
                disabled={importing}
                className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                style={{ fontWeight: 500 }}
              >
                {importing ? "Importing..." : `Import ${rows.length} rows`}
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4">
            <div className="bg-secondary/30 border border-border rounded-xl p-5 text-center">
              <Check className="h-10 w-10 mx-auto mb-2 text-foreground" />
              <div className="text-base text-foreground" style={{ fontWeight: 500 }}>{result.inserted} imported</div>
              {result.failed > 0 && (
                <div className="text-sm text-destructive mt-1">{result.failed} failed</div>
              )}
            </div>
            {result.errors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-xs">
                <div className="flex items-center gap-2 text-destructive mb-2" style={{ fontWeight: 500 }}>
                  <AlertCircle className="h-4 w-4" /> Errors (first 10)
                </div>
                <ul className="space-y-1 text-foreground/80">
                  {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              </div>
            )}
            <button onClick={onClose} className="w-full rounded-full bg-primary px-4 py-2.5 text-sm text-primary-foreground hover:bg-primary-hover" style={{ fontWeight: 500 }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
