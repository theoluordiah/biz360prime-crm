import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, canEdit } from "@/lib/auth-context";
import { formatDate, initials } from "@/lib/format";
import { Plus, X, CalendarDays, List, Check, Clock, MapPin, Video, Phone } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/tasks")({
  component: TasksPage,
});

const TYPE_ICON: Record<string, any> = {
  task: Check,
  meeting: Video,
  call: Phone,
  follow_up: Clock,
};

const PRIORITY_BG: Record<string, string> = {
  low: "#e7e0d2",
  medium: "#fde2c0",
  high: "#fde0e0",
  urgent: "#e2725b",
};

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function ymd(d: Date) { return d.toISOString().slice(0, 10); }

function TasksPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [openAdd, setOpenAdd] = useState(false);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const tasks = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*, deals(title), contacts(first_name, last_name), task_assignees(user_id, profiles:user_id(display_name, avatar_url))")
        .order("due_at", { ascending: true, nullsFirst: false });
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

  const deals = useQuery({
    queryKey: ["deals-light"],
    queryFn: async () => {
      const { data } = await supabase.from("deals").select("id, title").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const tasksByDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    (tasks.data ?? []).forEach((t: any) => {
      if (!t.due_at) return;
      const k = ymd(new Date(t.due_at));
      (map[k] ??= []).push(t);
    });
    return map;
  }, [tasks.data]);

  const toggleComplete = async (t: any) => {
    const next = t.status === "completed" ? "pending" : "completed";
    await supabase
      .from("tasks")
      .update({ status: next, completed_at: next === "completed" ? new Date().toISOString() : null })
      .eq("id", t.id);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const addTask = async (form: FormData) => {
    const title = String(form.get("title") || "").trim();
    if (!title) { toast.error("Title required"); return; }
    const due = String(form.get("due_at") || "");
    const assignees = form.getAll("assignee").map(String).filter(Boolean);

    const { data: created, error } = await supabase
      .from("tasks")
      .insert({
        title,
        description: String(form.get("description") || "").trim() || null,
        type: String(form.get("type") || "task") as any,
        priority: String(form.get("priority") || "medium") as any,
        due_at: due ? new Date(due).toISOString() : null,
        duration_minutes: Number(form.get("duration_minutes") || 0) || null,
        location: String(form.get("location") || "").trim() || null,
        meeting_url: String(form.get("meeting_url") || "").trim() || null,
        deal_id: String(form.get("deal_id") || "") || null,
        owner_id: user!.id,
      })
      .select()
      .single();

    if (error || !created) { toast.error(error?.message ?? "Failed"); return; }

    if (assignees.length > 0) {
      await supabase.from("task_assignees").insert(assignees.map((uid) => ({ task_id: created.id, user_id: uid })));
      // notify each assignee
      await supabase.from("notifications").insert(
        assignees.filter((uid) => uid === user!.id || true).map((uid) => ({
          user_id: uid,
          type: "task_assigned" as const,
          title: `New ${created.type}: ${created.title}`,
          body: due ? `Due ${formatDate(due)}` : null,
          link: "/tasks",
        }))
      );
    }

    toast.success("Saved");
    setOpenAdd(false);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  // Calendar grid
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const startWeekday = monthStart.getDay();
  const days: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) days.push(null);
  for (let d = 1; d <= monthEnd.getDate(); d++) days.push(new Date(month.getFullYear(), month.getMonth(), d));
  while (days.length % 7 !== 0) days.push(null);

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl text-foreground" style={{ fontWeight: 500 }}>Tasks & Meetings</h1>
          <p className="text-sm text-muted-foreground mt-1">Plan your week, assign teammates, never miss a follow-up.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full border border-border bg-card p-1">
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${view === "list" ? "bg-secondary text-foreground" : "text-muted-foreground"}`}
              style={{ fontWeight: 500 }}
            >
              <List className="h-3.5 w-3.5" /> List
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${view === "calendar" ? "bg-secondary text-foreground" : "text-muted-foreground"}`}
              style={{ fontWeight: 500 }}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Calendar
            </button>
          </div>
          {canEdit(role) && (
            <button onClick={() => setOpenAdd(true)} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary-hover" style={{ fontWeight: 500 }}>
              <Plus className="h-4 w-4" /> New
            </button>
          )}
        </div>
      </div>

      {view === "list" ? (
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {(tasks.data ?? []).length === 0 && (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              No tasks yet — create your first one to start tracking work.
            </div>
          )}
          {(tasks.data ?? []).map((t: any) => {
            const Icon = TYPE_ICON[t.type] ?? Check;
            const overdue = t.due_at && new Date(t.due_at) < new Date() && t.status !== "completed";
            return (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => toggleComplete(t)}
                  className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${t.status === "completed" ? "bg-primary border-primary" : "border-border hover:border-primary"}`}
                >
                  {t.status === "completed" && <Check className="h-3 w-3 text-primary-foreground" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className={`text-sm truncate ${t.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`} style={{ fontWeight: 500 }}>
                      {t.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: PRIORITY_BG[t.priority], color: t.priority === "urgent" ? "white" : "var(--color-foreground)" }}>
                      {t.priority}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                    {t.due_at && (
                      <span className={overdue ? "text-destructive" : ""}>
                        {new Date(t.due_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </span>
                    )}
                    {t.deals?.title && <span>· {t.deals.title}</span>}
                    {t.location && <span className="inline-flex items-center gap-1">· <MapPin className="h-3 w-3" />{t.location}</span>}
                  </div>
                </div>
                <div className="flex -space-x-2">
                  {(t.task_assignees ?? []).slice(0, 3).map((a: any) => (
                    <div key={a.user_id} className="h-6 w-6 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[10px] text-foreground" style={{ fontWeight: 500 }} title={a.profiles?.display_name}>
                      {initials(a.profiles?.display_name ?? "?")}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setMonth(addMonths(month, -1))} className="text-sm text-muted-foreground hover:text-foreground px-2">‹ Prev</button>
            <span className="text-sm text-foreground" style={{ fontWeight: 500 }}>
              {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
            <button onClick={() => setMonth(addMonths(month, 1))} className="text-sm text-muted-foreground hover:text-foreground px-2">Next ›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-[10px] text-muted-foreground mb-1" style={{ fontWeight: 500 }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d, i) => {
              if (!d) return <div key={i} className="aspect-square" />;
              const dayTasks = tasksByDay[ymd(d)] ?? [];
              const isToday = ymd(d) === ymd(new Date());
              return (
                <div key={i} className={`aspect-square rounded-lg border p-1 overflow-hidden ${isToday ? "border-primary bg-primary/5" : "border-border bg-muted/20"}`}>
                  <div className="text-[10px] text-muted-foreground mb-0.5" style={{ fontWeight: isToday ? 600 : 400 }}>{d.getDate()}</div>
                  <div className="space-y-0.5">
                    {dayTasks.slice(0, 2).map((t) => (
                      <div key={t.id} className="text-[9px] truncate rounded px-1 py-0.5" style={{ backgroundColor: PRIORITY_BG[t.priority], color: t.priority === "urgent" ? "white" : "var(--color-foreground)" }}>
                        {t.title}
                      </div>
                    ))}
                    {dayTasks.length > 2 && <div className="text-[9px] text-muted-foreground">+{dayTasks.length - 2} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {openAdd && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-foreground/20" onClick={() => setOpenAdd(false)} />
          <div className="w-full max-w-md bg-card h-full overflow-y-auto p-6 border-l border-border">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg text-foreground" style={{ fontWeight: 500 }}>New task or meeting</h2>
              <button onClick={() => setOpenAdd(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); addTask(new FormData(e.currentTarget)); }} className="space-y-3">
              <Field label="Title" name="title" required />
              <div className="grid grid-cols-2 gap-3">
                <Sel label="Type" name="type" options={[{ v: "task", l: "Task" }, { v: "meeting", l: "Meeting" }, { v: "call", l: "Call" }, { v: "follow_up", l: "Follow-up" }]} />
                <Sel label="Priority" name="priority" options={[{ v: "low", l: "Low" }, { v: "medium", l: "Medium" }, { v: "high", l: "High" }, { v: "urgent", l: "Urgent" }]} defaultValue="medium" />
              </div>
              <Field label="Due date & time" name="due_at" type="datetime-local" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Duration (min)" name="duration_minutes" type="number" />
                <Field label="Location" name="location" />
              </div>
              <Field label="Meeting URL" name="meeting_url" placeholder="https://..." />
              <div>
                <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>Linked deal</label>
                <select name="deal_id" className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary">
                  <option value="">— None —</option>
                  {(deals.data ?? []).map((d: any) => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>Assign team members</label>
                <div className="rounded-lg border border-input bg-input-bg p-2 max-h-32 overflow-y-auto space-y-1">
                  {(profiles.data ?? []).map((p: any) => (
                    <label key={p.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer">
                      <input type="checkbox" name="assignee" value={p.id} defaultChecked={p.id === user?.id} className="accent-primary" />
                      <span className="text-sm text-foreground">{p.display_name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>Description</label>
                <textarea name="description" rows={3} className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary" />
              </div>
              <button type="submit" className="w-full rounded-full bg-primary px-4 py-2.5 text-sm text-primary-foreground hover:bg-primary-hover" style={{ fontWeight: 500 }}>
                Save
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, name, type = "text", required = false, placeholder }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>{label}{required && <span className="text-destructive"> *</span>}</label>
      <input name={name} type={type} required={required} placeholder={placeholder} maxLength={500} className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30" />
    </div>
  );
}

function Sel({ label, name, options, defaultValue }: { label: string; name: string; options: { v: string; l: string }[]; defaultValue?: string }) {
  return (
    <div>
      <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>{label}</label>
      <select name={name} defaultValue={defaultValue} className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary">
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}
