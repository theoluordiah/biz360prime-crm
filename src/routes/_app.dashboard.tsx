import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { greeting, formatCurrency, initials, timeAgo } from "@/lib/format";
import { TempBadge, Pill } from "@/components/Badge";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { Sparkles, TrendingUp, Users, Mail, DollarSign } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { profile } = useAuth();

  const metrics = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => {
      const [deals, contacts, activities] = await Promise.all([
        supabase.from("deals").select("value, stage_id, source, pipeline_stages(name, is_won, is_lost)"),
        supabase.from("contacts").select("id"),
        supabase.from("activities").select("id, type").eq("type", "email"),
      ]);
      const allDeals = deals.data ?? [];
      const open = allDeals.filter((d: any) => !d.pipeline_stages?.is_won && !d.pipeline_stages?.is_lost);
      const forecast = open.reduce((s: number, d: any) => s + Number(d.value || 0), 0);
      // source distribution
      const sourceMap: Record<string, number> = {};
      allDeals.forEach((d: any) => {
        const src = d.source || "Direct";
        sourceMap[src] = (sourceMap[src] ?? 0) + Number(d.value || 0);
      });
      const sources = Object.entries(sourceMap).map(([name, value]) => ({ name, value }));
      return {
        openDeals: open.length,
        forecast,
        contactCount: contacts.data?.length ?? 0,
        emailCount: activities.data?.length ?? 0,
        sources,
      };
    },
  });

  const recentContacts = useQuery({
    queryKey: ["dashboard-recent-contacts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, role_title, temperature, companies(name)")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const pipelinePreview = useQuery({
    queryKey: ["dashboard-pipeline"],
    queryFn: async () => {
      const { data: stages } = await supabase
        .from("pipeline_stages")
        .select("*")
        .order("position")
        .limit(4);
      const { data: deals } = await supabase
        .from("deals")
        .select("id, title, value, stage_id, companies(name)");
      return { stages: stages ?? [], deals: deals ?? [] };
    },
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl text-foreground" style={{ fontWeight: 500 }}>
          {greeting()}, {profile?.display_name?.split(" ")[0] ?? "there"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Here's how your pipeline looks today.</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={<TrendingUp className="h-4 w-4" />} label="Open Deals" value={metrics.data?.openDeals ?? 0} />
        <MetricCard icon={<DollarSign className="h-4 w-4" />} label="Revenue Forecast" value={formatCurrency(metrics.data?.forecast ?? 0)} />
        <MetricCard icon={<Users className="h-4 w-4" />} label="Active Contacts" value={metrics.data?.contactCount ?? 0} />
        <MetricCard icon={<Mail className="h-4 w-4" />} label="Emails Sent" value={metrics.data?.emailCount ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline preview */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base text-foreground" style={{ fontWeight: 500 }}>Pipeline preview</h2>
            <Link to="/pipeline" className="text-xs text-primary hover:underline" style={{ fontWeight: 500 }}>View all</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(pipelinePreview.data?.stages ?? []).map((s: any) => {
              const stageDeals = (pipelinePreview.data?.deals ?? []).filter((d: any) => d.stage_id === s.id);
              const total = stageDeals.reduce((sum: number, d: any) => sum + Number(d.value || 0), 0);
              return (
                <div key={s.id} className="rounded-lg border border-border bg-muted/40 p-3">
                  <div className="text-xs text-muted-foreground" style={{ fontWeight: 500 }}>{s.name}</div>
                  <div className="text-lg text-foreground mt-1" style={{ fontWeight: 500 }}>{stageDeals.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">{formatCurrency(total)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI draft preview */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-base text-foreground" style={{ fontWeight: 500 }}>AI Email Draft</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Generate context-aware emails in seconds.</p>
          <div className="rounded-lg bg-muted/60 p-3 text-xs text-foreground/80 leading-relaxed border border-border">
            <div style={{ fontWeight: 500 }} className="mb-1">Subject: Quick check-in on next steps</div>
            Hi Sarah, I wanted to follow up on our conversation last week...
          </div>
          <Link to="/ai-writer" className="mt-4 block text-center rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary-hover" style={{ fontWeight: 500 }}>
            Open AI Writer
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent contacts */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base text-foreground" style={{ fontWeight: 500 }}>Recent contacts</h2>
            <Link to="/contacts" className="text-xs text-primary hover:underline" style={{ fontWeight: 500 }}>View all</Link>
          </div>
          <div className="space-y-2">
            {(recentContacts.data ?? []).length === 0 && (
              <div className="text-sm text-muted-foreground py-6 text-center">No contacts yet — add your first one from Contacts.</div>
            )}
            {(recentContacts.data ?? []).map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-xs text-foreground" style={{ fontWeight: 500 }}>
                  {initials(`${c.first_name} ${c.last_name}`)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground truncate" style={{ fontWeight: 500 }}>{c.first_name} {c.last_name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {c.role_title ?? "—"}{c.companies?.name ? ` · ${c.companies.name}` : ""}
                  </div>
                </div>
                <TempBadge temp={c.temperature} />
              </div>
            ))}
          </div>
        </div>

        {/* Source bar chart */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-base text-foreground mb-4" style={{ fontWeight: 500 }}>Deal sources</h2>
          {metrics.data?.sources && metrics.data.sources.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={metrics.data.sources}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eacdd6" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#9a6070", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#9a6070", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "#fdf3f7" }}
                  contentStyle={{ background: "#fff", border: "1px solid #eacdd6", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="value" fill="#c86b85" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-muted-foreground py-10 text-center">
              <Pill tone="primary">No data yet</Pill>
              <div className="mt-2 text-xs">Add deals to see source breakdown</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs" style={{ fontWeight: 500 }}>{label}</span>
      </div>
      <div className="text-2xl text-foreground mt-2" style={{ fontWeight: 500 }}>{value}</div>
    </div>
  );
}
