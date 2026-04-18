import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background" />;
  return <Navigate to={user ? "/dashboard" : "/login"} />;
}
