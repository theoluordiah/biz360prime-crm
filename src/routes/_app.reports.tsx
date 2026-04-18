import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/_app/reports")({
  component: ReportsPage,
});

const COLORS = ["#c86b85", "#e6a4b4", "#eacdd6", "#fdf3f7", "#9a6070", "#b8c5d6"];

function ReportsPage() {
  const data = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data: deals } = await supabase.from("deals").select("value, source, industry, stage_id, pipeline_stages(name, is_won, is_lost)");
      const { data: contacts } = await supabase.from("contacts").select("temperature");
      const allDeals = deals ?? [];

      // by stage
      const stageMap: Record<string, { name: string; count: number; value: number }> = {};
      allDeals.forEach((d: any) => {
        const n = d.pipeline_stages?.name ?? "Unassigned";
        if (!stageMap[n]) stageMap[n] = { name: n, count: 0, value: 0 };
        stageMap[n].count++;
        stageMap[n].value += Number(d.value || 0);
      });

      // by source
      const sourceMap: Record<string, number> = {};
      allDeals.forEach((d: any) => {
        const s = d.source || "Direct";
        sourceMap[s] = (sourceMap[s] ?? 0) + 1;
      });

      // temperature
      const tempMap: Record<string, number> = { hot: 0, warm: 0, cold: 0 };
      (contacts ?? []).forEach((c: any) => { tempMap[c.temperature ?? "warm"]++; });

      const won = allDeals.filter((d: any) => d.pipeline_stages?.is_won).reduce((s: number, d: any) => s + Number(d.value || 0), 0);
      const lost = allDeals.filter((d: any) => d.pipeline_stages?.is_lost).reduce((s: number, d: any) => s + Number(d.value || 0), 0);
      const open = allDeals.filter((d: any) => !d.pipeline_stages?.is_won && !d.pipeline_stages?.is_lost).reduce((s: number, d: any) => s + Number(d.value || 0), 0);

      return {
        byStage: Object.values(stageMap),
        bySource: Object.entries(sourceMap).map(([name, value]) => ({ name, value })),
        byTemp: Object.entries(tempMap).map(([name, value]) => ({ name: name[0].toUpperCase() + name.slice(1), value })),
        won, lost, open,
        total: allDeals.length,
      };
    },
  });

  return (
    <div className="space-y-5 max-w-7xl">
      <div>
        <h1 className="text-2xl text-foreground" style={{ fontWeight: 500 }}>Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Pipeline insights at a glance.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total deals" value={data.data?.total ?? 0} />
        <Stat label="Open value" value={formatCurrency(data.data?.open ?? 0)} />
        <Stat label="Won" value={formatCurrency(data.data?.won ?? 0)} />
        <Stat label="Lost" value={formatCurrency(data.data?.lost ?? 0)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Pipeline by stage">
          {(data.data?.byStage ?? []).length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.data?.byStage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eacdd6" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#9a6070", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#9a6070", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#fdf3f7" }} contentStyle={{ background: "#fff", border: "1px solid #eacdd6", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="#c86b85" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </Card>
        <Card title="Lead source mix">
          {(data.data?.bySource ?? []).length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.data?.bySource} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                  {data.data?.bySource.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #eacdd6", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#9a6070" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </Card>
        <Card title="Lead temperature">
          {(data.data?.byTemp ?? []).some((t) => t.value > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.data?.byTemp} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#eacdd6" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#9a6070", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: "#9a6070", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#fdf3f7" }} contentStyle={{ background: "#fff", border: "1px solid #eacdd6", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="#e6a4b4" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="text-xs text-muted-foreground" style={{ fontWeight: 500 }}>{label}</div>
      <div className="text-2xl text-foreground mt-2" style={{ fontWeight: 500 }}>{value}</div>
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h2 className="text-base text-foreground mb-3" style={{ fontWeight: 500 }}>{title}</h2>
      {children}
    </div>
  );
}
function Empty() {
  return <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">No data yet</div>;
}
