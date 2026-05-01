import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, canEdit, canManage } from "@/lib/auth-context";
import { formatCurrency, initials } from "@/lib/format";
import { Plus, X, Users, Check, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  closestCenter,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";

export const Route = createFileRoute("/_app/pipeline")({
  component: PipelinePage,
});

function PipelinePage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [openAdd, setOpenAdd] = useState(false);
  const [editDeal, setEditDeal] = useState<any | null>(null);
  const canManageDeals = canManage(role);

  const stages = useQuery({
    queryKey: ["stages"],
    queryFn: async () => {
      const { data } = await supabase.from("pipeline_stages").select("*").order("position");
      return data ?? [];
    },
  });

  const deals = useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const { data } = await supabase.from("deals").select("*, companies(name)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const profiles = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, display_name, email");
      return data ?? [];
    },
  });

  const stageAssignees = useQuery({
    queryKey: ["stage-assignees"],
    queryFn: async () => {
      const { data } = await supabase.from("stage_assignees").select("stage_id, user_id");
      return data ?? [];
    },
  });

  const assigneesByStage = useMemo(() => {
    const map: Record<string, string[]> = {};
    (stageAssignees.data ?? []).forEach((a: any) => {
      (map[a.stage_id] ??= []).push(a.user_id);
    });
    return map;
  }, [stageAssignees.data]);

  const profileById = useMemo(() => {
    const map: Record<string, any> = {};
    (profiles.data ?? []).forEach((p: any) => { map[p.id] = p; });
    return map;
  }, [profiles.data]);

  const canManageAssignees = role === "admin" || role === "sales_manager";

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragEnd = async (e: DragEndEvent) => {
    const dealId = e.active.id as string;
    const newStageId = e.over?.id as string | undefined;
    if (!newStageId) return;
    const deal = deals.data?.find((d: any) => d.id === dealId);
    if (!deal || deal.stage_id === newStageId) return;
    // optimistic
    qc.setQueryData(["deals"], (old: any) =>
      (old ?? []).map((d: any) => (d.id === dealId ? { ...d, stage_id: newStageId } : d))
    );
    const { error } = await supabase.from("deals").update({ stage_id: newStageId }).eq("id", dealId);
    if (error) {
      toast.error(error.message);
      qc.invalidateQueries({ queryKey: ["deals"] });
    } else {
      // log activity
      await supabase.from("activities").insert({
        deal_id: dealId,
        user_id: user!.id,
        type: "stage_change",
        content: `Moved to new stage`,
      });
    }
  };

  const dealsByStage = useMemo(() => {
    const map: Record<string, any[]> = {};
    (deals.data ?? []).forEach((d: any) => {
      const k = d.stage_id ?? "unassigned";
      (map[k] ??= []).push(d);
    });
    return map;
  }, [deals.data]);

  const addDeal = async (form: FormData) => {
    const title = String(form.get("title") || "").trim();
    if (!title) { toast.error("Title required"); return; }
    const { error } = await supabase.from("deals").insert({
      title,
      value: Number(form.get("value") || 0),
      source: String(form.get("source") || "").trim() || null,
      industry: String(form.get("industry") || "").trim() || null,
      stage_id: String(form.get("stage_id") || "") || stages.data?.[0]?.id,
      owner_id: user!.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Deal added");
    setOpenAdd(false);
    qc.invalidateQueries({ queryKey: ["deals"] });
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl text-foreground" style={{ fontWeight: 500 }}>Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">Drag deals between stages to update.</p>
        </div>
        {canEdit(role) && (
          <button onClick={() => setOpenAdd(true)} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary-hover" style={{ fontWeight: 500 }}>
            <Plus className="h-4 w-4" /> Add deal
          </button>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {(stages.data ?? []).map((s: any) => {
            const stageDeals = dealsByStage[s.id] ?? [];
            const total = stageDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);
            const stageAssigneeIds = assigneesByStage[s.id] ?? [];
            return (
              <DroppableColumn
                key={s.id}
                id={s.id}
                name={s.name}
                count={stageDeals.length}
                total={total}
                assignees={stageAssigneeIds.map((id) => profileById[id]).filter(Boolean)}
                allProfiles={profiles.data ?? []}
                canManage={canManageAssignees}
                onToggleAssignee={async (userId, isAssigned) => {
                  if (isAssigned) {
                    const { error } = await supabase.from("stage_assignees").delete().eq("stage_id", s.id).eq("user_id", userId);
                    if (error) { toast.error(error.message); return; }
                  } else {
                    const { error } = await supabase.from("stage_assignees").insert({ stage_id: s.id, user_id: userId });
                    if (error) { toast.error(error.message); return; }
                  }
                  qc.invalidateQueries({ queryKey: ["stage-assignees"] });
                }}
              >
                {stageDeals.map((d) => (
                  <DealCard
                    key={d.id}
                    deal={d}
                    canManage={canManageDeals}
                    onEdit={() => setEditDeal(d)}
                    onDelete={async () => {
                      if (!confirm(`Delete deal "${d.title}"?`)) return;
                      const { error } = await supabase.from("deals").delete().eq("id", d.id);
                      if (error) { toast.error(error.message); return; }
                      toast.success("Deal deleted");
                      qc.invalidateQueries({ queryKey: ["deals"] });
                    }}
                  />
                ))}
              </DroppableColumn>
            );
          })}
        </div>
      </DndContext>

      {openAdd && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-foreground/20" onClick={() => setOpenAdd(false)} />
          <div className="w-full max-w-md bg-card h-full overflow-y-auto p-6 border-l border-border">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg text-foreground" style={{ fontWeight: 500 }}>Add deal</h2>
              <button onClick={() => setOpenAdd(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); addDeal(new FormData(e.currentTarget)); }} className="space-y-3">
              <Field label="Title" name="title" required />
              <Field label="Value" name="value" type="number" />
              <Field label="Source" name="source" placeholder="Referral, Website, LinkedIn..." />
              <Field label="Industry" name="industry" />
              <div>
                <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>Stage</label>
                <select name="stage_id" className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary">
                  {(stages.data ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full rounded-full bg-primary px-4 py-2.5 text-sm text-primary-foreground hover:bg-primary-hover" style={{ fontWeight: 500 }}>
                Save deal
              </button>
            </form>
          </div>
        </div>
      )}

      {editDeal && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-foreground/20" onClick={() => setEditDeal(null)} />
          <div className="w-full max-w-md bg-card h-full overflow-y-auto p-6 border-l border-border">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg text-foreground" style={{ fontWeight: 500 }}>Edit deal</h2>
              <button onClick={() => setEditDeal(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <form
              onSubmit={async (e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const title = String(form.get("title") || "").trim();
                if (!title) { toast.error("Title required"); return; }
                const { error } = await supabase.from("deals").update({
                  title,
                  value: Number(form.get("value") || 0),
                  source: String(form.get("source") || "").trim() || null,
                  industry: String(form.get("industry") || "").trim() || null,
                  stage_id: String(form.get("stage_id") || "") || editDeal.stage_id,
                }).eq("id", editDeal.id);
                if (error) { toast.error(error.message); return; }
                toast.success("Deal updated");
                setEditDeal(null);
                qc.invalidateQueries({ queryKey: ["deals"] });
              }}
              className="space-y-3"
            >
              <Field label="Title" name="title" required defaultValue={editDeal.title ?? ""} />
              <Field label="Value" name="value" type="number" defaultValue={String(editDeal.value ?? 0)} />
              <Field label="Source" name="source" defaultValue={editDeal.source ?? ""} />
              <Field label="Industry" name="industry" defaultValue={editDeal.industry ?? ""} />
              <div>
                <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>Stage</label>
                <select name="stage_id" defaultValue={editDeal.stage_id ?? ""} className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary">
                  {(stages.data ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full rounded-full bg-primary px-4 py-2.5 text-sm text-primary-foreground hover:bg-primary-hover" style={{ fontWeight: 500 }}>
                Save changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DroppableColumn({
  id,
  name,
  count,
  total,
  assignees,
  allProfiles,
  canManage,
  onToggleAssignee,
  children,
}: {
  id: string;
  name: string;
  count: number;
  total: number;
  assignees: any[];
  allProfiles: any[];
  canManage: boolean;
  onToggleAssignee: (userId: string, isAssigned: boolean) => void | Promise<void>;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [open, setOpen] = useState(false);
  const assignedIds = new Set(assignees.map((a) => a.id));

  return (
    <div ref={setNodeRef} className={`w-72 shrink-0 rounded-xl border border-border bg-card ${isOver ? "ring-2 ring-secondary" : ""}`}>
      <div className="px-4 py-3 border-b border-border relative">
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground" style={{ fontWeight: 500 }}>{name}</span>
          <span className="text-xs text-muted-foreground">{count}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{formatCurrency(total)}</div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex -space-x-1.5">
            {assignees.length === 0 && <span className="text-[10px] text-muted-foreground">No team assigned</span>}
            {assignees.slice(0, 4).map((a: any) => (
              <div
                key={a.id}
                title={a.display_name || a.email}
                className="h-6 w-6 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[10px] text-foreground"
                style={{ fontWeight: 500 }}
              >
                {initials(a.display_name || a.email || "?")}
              </div>
            ))}
            {assignees.length > 4 && (
              <div className="h-6 w-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px] text-muted-foreground">
                +{assignees.length - 4}
              </div>
            )}
          </div>
          {canManage && (
            <button
              onClick={() => setOpen((v) => !v)}
              title="Manage team"
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <Users className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-2 top-full mt-1 z-50 w-60 rounded-lg border border-border bg-card shadow-lg p-2 max-h-72 overflow-y-auto">
              <div className="text-xs text-muted-foreground px-2 py-1.5">Assign to {name}</div>
              {allProfiles.length === 0 && (
                <div className="text-xs text-muted-foreground px-2 py-2">No team members</div>
              )}
              {allProfiles.map((p: any) => {
                const isAssigned = assignedIds.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => onToggleAssignee(p.id, isAssigned)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-left"
                  >
                    <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-[10px] text-foreground" style={{ fontWeight: 500 }}>
                      {initials(p.display_name || p.email || "?")}
                    </div>
                    <span className="flex-1 text-xs text-foreground truncate">{p.display_name || p.email}</span>
                    {isAssigned && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
      <div className="p-3 space-y-2 min-h-[200px]">
        {children}
      </div>
    </div>
  );
}

function DealCard({ deal, canManage, onEdit, onDelete }: { deal: any; canManage: boolean; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-muted/50 border border-border rounded-lg p-3 ${isDragging ? "opacity-60" : ""}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <div className="text-sm text-foreground truncate" style={{ fontWeight: 500 }}>{deal.title}</div>
        <div className="text-xs text-muted-foreground truncate mt-0.5">{deal.companies?.name ?? "—"}</div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-foreground" style={{ fontWeight: 500 }}>{formatCurrency(Number(deal.value || 0))}</span>
          {deal.industry && <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/40 text-foreground">{deal.industry}</span>}
        </div>
      </div>
      {canManage && (
        <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-border">
          <button
            onClick={onEdit}
            onPointerDown={(e) => e.stopPropagation()}
            title="Edit deal"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/40 hover:bg-secondary text-foreground text-[11px]"
            style={{ fontWeight: 500 }}
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
          <button
            onClick={onDelete}
            onPointerDown={(e) => e.stopPropagation()}
            title="Delete deal"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground text-destructive text-[11px]"
            style={{ fontWeight: 500 }}
          >
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, name, type = "text", required = false, placeholder, defaultValue }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string; defaultValue?: string }) {
  return (
    <div>
      <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>{label}{required && <span className="text-destructive"> *</span>}</label>
      <input name={name} type={type} required={required} placeholder={placeholder} defaultValue={defaultValue} maxLength={255} className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30" />
    </div>
  );
}
