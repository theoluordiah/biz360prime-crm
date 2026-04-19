import type { ReactNode } from "react";

export function TempBadge({ temp }: { temp: "hot" | "warm" | "cold" | null | undefined }) {
  const t = temp ?? "warm";
  const styles: Record<string, { bg: string; fg: string; label: string }> = {
    hot: { bg: "#444441", fg: "#ffffff", label: "Hot" },
    warm: { bg: "#d4537e", fg: "#2a2a28", label: "Warm" },
    cold: { bg: "#ede9df", fg: "#2a2a28", label: "Cold" },
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
      ? { background: "#f8f6ef", color: "#444441" }
      : { background: "#f8f6ef", color: "#6b6a66" };
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 text-xs rounded-full" style={{ ...styles, fontWeight: 500 }}>
      {children}
    </span>
  );
}
