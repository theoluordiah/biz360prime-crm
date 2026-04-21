import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, Target, Clock, Users, DollarSign, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_app/analytics")({
  component: AnalyticsPage,
});

const PALETTE = ["#e2725b", "#f5b7a3", "#fde2c0", "#e0ecdc", "#dce9f0", "#e6e2f0", "#f0e6d2"];

function AnalyticsPage() {
  const data = useQuery({
    queryKey: ["analytics-board"],
    queryFn: async () => {
      const [deals, leads, tasks, stages] = await Promise.all([
        supabase.from("deals").select("*, pipeline_stages(name, is_won, is_lost)"),
        supabase.from("leads").select("status, source, channel, created_at"),
        supabase.from("tasks").select("status, owner_id, created_at, completed_at, profiles:owner_id(display_name)"),
        supabase.from("pipeline_stages").select("*").order("position"),
      ]);
      return {
        deals: deals.data ?? [],
        leads: leads.data ?? [],
        tasks: tasks.data ?? [],
        stages: stages.data ?? [],
      };
    },
  });

  const metrics = useMemo(() => {
    if (!data.data) return null;
    const { deals, leads, tasks } = data.data;
    const won = deals.filter((d: any) => d.pipeline_stages?.is_won);
    const lost = deals.filter((d: any) => d.pipeline_stages?.is_lost);
    const open = deals.filter((d: any) => !d.pipeline_stages?.is_won && !d.pipeline_stages?.is_lost);
    const closed = won.length + lost.length;
    const winRate = closed > 0 ? (won.length / closed) * 100 : 0;
    const wonValue = won.reduce((s: number, d: any) => s + Number(d.value || 0), 0);
    const pipelineValue = open.reduce((s: number, d: any) => s + Number(d.value || 0), 0);

    // Avg cycle = days between created_at and stage_changed_at for won deals
    const cycleDays = won
      .map((d: any) => (new Date(d.stage_changed_at).getTime() - new Date(d.created_at).getTime()) / 86400000)
      .filter((n: number) => n > 0);
    const avgCycle = cycleDays.length ? cycleDays.reduce((a: number, b: number) => a + b, 0) / cycleDays.length : 0;

    // Lead conversion
    const convertedLeads = leads.filter((l: any) => l.status === "converted").length;
    const leadConv = leads.length > 0 ? (convertedLeads / leads.length) * 100 : 0;

    // Tasks completed (last 30d)
    const cutoff = Date.now() - 30 * 86400000;
    const recentDone = tasks.filter((t: any) => t.status === "completed" && t.completed_at && new Date(t.completed_at).getTime() > cutoff).length;

    // Lead source breakdown
    const sourceMap: Record<string, number> = {};
    leads.forEach((l: any) => {
      const k = l.source ?? l.channel ?? "Direct";
      sourceMap[k] = (sourceMap[k] ?? 0) + 1;
    });
    const sources = Object.entries(sourceMap).map(([name, value]) => ({ name, value }));

    // Stage distribution (count + value)
    const stageDist = data.data.stages.map((s: any) => {
      const ds = deals.filter((d: any) => d.stage_id === s.id);
      return { name: s.name, count: ds.length, value: ds.reduce((sum: number, d: any) => sum + Number(d.value || 0), 0) };
    });

    // Team performance — tasks completed per owner
    const teamMap: Record<string, { name: string; done: number; open: number }> = {};
    tasks.forEach((t: any) => {
      const name = t.profiles?.display_name ?? "Unassigned";
      teamMap[name] ??= { name, done: 0, open: 0 };
      if (t.status === "completed") teamMap[name].done++;
      else teamMap[name].open++;
    });
    const team = Object.values(teamMap).sort((a, b) => b.done - a.done).slice(0, 8);

    return { wonValue, pipelineValue, winRate, avgCycle, leadConv, recentDone, sources, stageDist, team };
  }, [data.data]);

  if (!metrics) {
    return <div className="text-sm text-muted-foreground">Loading analytics…</div>;
  }

  return (
    <div className="space-y-5 max-w-7xl">
      <div>
        <h1 className="text-2xl text-foreground" style={{ fontWeight: 500 }}>Analytics Board</h1>
        <p className="text-sm text-muted-foreground mt-1">Performance, conversion, and team productivity at a glance.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPI icon={<DollarSign className="h-4 w-4" />} label="Won revenue" value={formatCurrency(metrics.wonValue)} tone="#e2725b" />
        <KPI icon={<TrendingUp className="h-4 w-4" />} label="Pipeline value" value={formatCurrency(metrics.pipelineValue)} tone="#f5b7a3" />
        <KPI icon={<Target className="h-4 w-4" />} label="Win rate" value={`${metrics.winRate.toFixed(0)}%`} tone="#fde2c0" />
        <KPI icon={<Clock className="h-4 w-4" />} label="Avg cycle" value={`${metrics.avgCycle.toFixed(0)}d`} tone="#e6e2f0" />
        <KPI icon={<Users className="h-4 w-4" />} label="Lead conv." value={`${metrics.leadConv.toFixed(0)}%`} tone="#dce9f0" />
        <KPI icon={<CheckCircle2 className="h-4 w-4" />} label="Tasks (30d)" value={String(metrics.recentDone)} tone="#e0ecdc" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stage distribution */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm text-foreground mb-4" style={{ fontWeight: 500 }}>Pipeline by stage</h2>
          {metrics.stageDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={metrics.stageDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3d9c4" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#8a6a55", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8a6a55", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #f3d9c4", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#e2725b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty>No deals yet</Empty>}
        </div>

        {/* Lead sources */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm text-foreground mb-4" style={{ fontWeight: 500 }}>Lead sources</h2>
          {metrics.sources.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={metrics.sources} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={{ fontSize: 11, fill: "#3a2418" }}>
                  {metrics.sources.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #f3d9c4", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <Empty>No leads yet</Empty>}
        </div>

        {/* Team performance */}
        <div className="bg-card border border-border rounded-xl p-5 lg:col-span-2">
          <h2 className="text-sm text-foreground mb-4" style={{ fontWeight: 500 }}>Team productivity</h2>
          {metrics.team.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={metrics.team} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3d9c4" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#8a6a55", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#8a6a55", fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #f3d9c4", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="done" name="Completed" fill="#e0ecdc" radius={[0, 6, 6, 0]} />
                <Bar dataKey="open" name="Open" fill="#fde2c0" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty>No tasks yet</Empty>}
        </div>
      </div>
    </div>
  );
}

function KPI({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: tone, color: "#3a2418" }}>{icon}</div>
        <span className="text-xs text-muted-foreground" style={{ fontWeight: 500 }}>{label}</span>
      </div>
      <div className="text-xl text-foreground mt-2" style={{ fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-muted-foreground py-12 text-center">{children}</div>;
}
