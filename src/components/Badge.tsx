import type { ReactNode } from "react";

export function TempBadge({ temp }: { temp: "hot" | "warm" | "cold" | null | undefined }) {
  const t = temp ?? "warm";
  const styles: Record<string, { bg: string; fg: string; label: string }> = {
    hot: { bg: "#e2725b", fg: "#ffffff", label: "Hot" },
    warm: { bg: "#f5b7a3", fg: "#3a2418", label: "Warm" },
    cold: { bg: "#fdeede", fg: "#3a2418", label: "Cold" },
  };
  const s = styles[t]!;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 text-xs rounded-full"
      style={{ background: s.bg, color: s.fg, fontWeight: 500 }}
    >
      {s.label}
    </span>
  );
}

export function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "primary" }) {
  const styles =
    tone === "primary"
      ? { background: "#fff3e6", color: "#e2725b" }
      : { background: "#fff3e6", color: "#8a6a55" };
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 text-xs rounded-full" style={{ ...styles, fontWeight: 500 }}>
      {children}
    </span>
  );
}
