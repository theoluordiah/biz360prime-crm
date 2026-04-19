import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Building2,
  KanbanSquare,
  Mail,
  Sparkles,
  BarChart3,
  Shield,
  Settings,
  Search,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { initials } from "@/lib/format";
import { useState } from "react";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/companies", label: "Companies", icon: Building2 },
  { to: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { to: "/email-sync", label: "Email Sync", icon: Mail },
  { to: "/ai-writer", label: "AI Writer", icon: Sparkles },
  { to: "/reports", label: "Reports", icon: BarChart3 },
] as const;

const ADMIN_NAV = [
  { to: "/roles", label: "Roles & Access", icon: Shield },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [search, setSearch] = useState("");

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex w-[200px] shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="px-5 py-6">
          <Link to="/dashboard" className="text-xl tracking-tight" style={{ color: "#e2725b", fontWeight: 500 }}>
            CRM360
          </Link>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map((item) => {
            const active = isActive(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-active-bg text-sidebar-active-fg"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {active && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                {!active && <Icon className="h-4 w-4 text-muted-foreground" />}
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="my-3 border-t border-border" />
          {ADMIN_NAV.map((item) => {
            const active = isActive(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-active-bg text-sidebar-active-fg"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {active && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                {!active && <Icon className="h-4 w-4 text-muted-foreground" />}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4">
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/login" });
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 md:px-8 py-3">
          <div className="md:hidden text-lg" style={{ color: "#e2725b", fontWeight: 500 }}>
            CRM360
          </div>
          <div className="flex-1 max-w-md">
            <div className="flex items-center gap-2 rounded-full bg-search-bg px-4 py-2 border border-transparent focus-within:border-secondary">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contacts, deals, companies..."
                className="bg-transparent flex-1 outline-none text-sm placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-sm" style={{ fontWeight: 500 }}>{profile?.display_name ?? "—"}</div>
              <div className="text-xs text-muted-foreground">{profile?.email}</div>
            </div>
            <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-sm text-foreground" style={{ fontWeight: 500 }}>
              {initials(profile?.display_name ?? "U")}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8 pb-24 md:pb-8">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around px-2 py-2 z-40">
          {NAV.slice(0, 5).map((item) => {
            const active = isActive(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px]">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
