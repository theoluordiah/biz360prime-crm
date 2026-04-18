import type { ReactNode } from "react";

export function TempBadge({ temp }: { temp: "hot" | "warm" | "cold" | null | undefined }) {
  const t = temp ?? "warm";
  const styles: Record<string, { bg: string; fg: string; label: string }> = {
    hot: { bg: "#c86b85", fg: "#ffffff", label: "Hot" },
    warm: { bg: "#e6a4b4", fg: "#4a2535", label: "Warm" },
    cold: { bg: "#e6e9f0", fg: "#4a2535", label: "Cold" },
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
      ? { background: "#fdf3f7", color: "#c86b85" }
      : { background: "#fdf3f7", color: "#9a6070" };
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 text-xs rounded-full" style={{ ...styles, fontWeight: 500 }}>
      {children}
    </span>
  );
}
