import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { timeAgo } from "@/lib/format";
import { Link } from "@tanstack/react-router";

export function NotificationsBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const notifs = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  // Realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["notifications", user.id] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, qc]);

  const unread = (notifs.data ?? []).filter((n: any) => !n.read_at).length;

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative h-9 w-9 rounded-full bg-secondary/50 hover:bg-secondary flex items-center justify-center transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4 text-foreground" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center" style={{ fontWeight: 600 }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-h-[28rem] overflow-y-auto rounded-xl border border-border bg-card shadow-lg z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm text-foreground" style={{ fontWeight: 500 }}>Notifications</span>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline" style={{ fontWeight: 500 }}>
                  Mark all read
                </button>
              )}
            </div>
            <div className="divide-y divide-border">
              {(notifs.data ?? []).length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  You're all caught up 🌿
                </div>
              )}
              {(notifs.data ?? []).map((n: any) => {
                const Inner = (
                  <div className="px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
                    <div className="flex items-start gap-2">
                      {!n.read_at && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground truncate" style={{ fontWeight: n.read_at ? 400 : 500 }}>
                          {n.title}
                        </div>
                        {n.body && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</div>}
                        <div className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</div>
                      </div>
                      {!n.read_at && (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); markRead(n.id); }}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Mark read"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
                return n.link ? (
                  <Link key={n.id} to={n.link} onClick={() => { setOpen(false); markRead(n.id); }}>{Inner}</Link>
                ) : (
                  <div key={n.id}>{Inner}</div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
