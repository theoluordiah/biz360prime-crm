import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/login")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cleanName = name.trim();
      if (!cleanName) throw new Error("Please enter a username");
      // Synthesize an email from the username so we can use Supabase email/password auth without an email step
      const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "user";
      const email = `${slug}-${Math.random().toString(36).slice(2, 8)}@crm360.local`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { display_name: cleanName },
        },
      });
      if (error) throw error;
      toast.success(`Welcome to CRM360, ${cleanName}!`);
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl tracking-tight" style={{ color: "#444441", fontWeight: 500 }}>
            CRM360
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your workspace — pick a username and password to get started.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>
                Username
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={60}
                autoFocus
                className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-60"
              style={{ fontWeight: 500 }}
            >
              {loading ? "Creating workspace..." : "Sign up & continue"}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          The first account created becomes the workspace admin.
        </p>
      </div>
    </div>
  );
}
