import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/login")({
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail) throw new Error("Please enter your email");
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/dashboard" });
      } else if (mode === "forgot") {
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail) throw new Error("Please enter your email");
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Check your email for a reset link");
        setMode("signin");
      } else {
        const cleanName = name.trim();
        if (!cleanName) throw new Error("Please enter a username");
        const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "user";
        const synthEmail = `${slug}-${Math.random().toString(36).slice(2, 8)}@crm360.local`;

        const { error } = await supabase.auth.signUp({
          email: synthEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { display_name: cleanName },
          },
        });
        if (error) throw error;
        toast.success(`Welcome to CRM360, ${cleanName}!`);
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl tracking-tight" style={{ color: "#e2725b", fontWeight: 500 }}>
            CRM360
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to your workspace."
              : mode === "forgot"
              ? "Enter your email and we'll send a reset link."
              : "Create your workspace — pick a username and password."}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          {mode !== "forgot" && (
            <div className="flex bg-muted rounded-lg p-1 mb-5">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="flex-1 rounded-md py-1.5 text-sm transition-colors"
                style={{
                  backgroundColor: mode === "signin" ? "var(--color-card)" : "transparent",
                  color: mode === "signin" ? "var(--color-foreground)" : "var(--color-muted-foreground)",
                  fontWeight: 500,
                }}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="flex-1 rounded-md py-1.5 text-sm transition-colors"
                style={{
                  backgroundColor: mode === "signup" ? "var(--color-card)" : "transparent",
                  color: mode === "signup" ? "var(--color-foreground)" : "var(--color-muted-foreground)",
                  fontWeight: 500,
                }}
              >
                Sign up
              </button>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {mode === "signin" || mode === "forgot" ? (
              <div>
                <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                />
              </div>
            ) : (
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
            )}
            {mode !== "forgot" && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm text-foreground" style={{ fontWeight: 500 }}>
                    Password
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-60"
              style={{ fontWeight: 500 }}
            >
              {loading
                ? mode === "signin"
                  ? "Signing in..."
                  : mode === "forgot"
                  ? "Sending link..."
                  : "Creating workspace..."
                : mode === "signin"
                ? "Sign in"
                : mode === "forgot"
                ? "Send reset link"
                : "Sign up & continue"}
            </button>
            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Back to sign in
              </button>
            )}
          </form>
        </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signin" ? (
              <div>
                <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                />
              </div>
            ) : (
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
            )}
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
              {loading
                ? mode === "signin" ? "Signing in..." : "Creating workspace..."
                : mode === "signin" ? "Sign in" : "Sign up & continue"}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          {mode === "signin"
            ? "Admins can manage roles from Roles & Access after signing in."
            : "The first account created becomes the workspace admin."}
        </p>
      </div>
    </div>
  );
}
