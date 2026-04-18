import { Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import type { ReactNode } from "react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="crm-skeleton h-6 w-40" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}
