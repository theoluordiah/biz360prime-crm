import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_app")({
  component: () => (
    <ProtectedRoute>
      <AppShell />
    </ProtectedRoute>
  ),
});
