import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created — welcome to CRM360!");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
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
          <Link to="/" className="text-3xl tracking-tight" style={{ color: "#c86b85", fontWeight: 500 }}>
            CRM360
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin" ? "Welcome back. Sign in to continue." : "Create your workspace in seconds."}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                  className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                />
              </div>
            )}
            <div>
              <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
                className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5 text-foreground" style={{ fontWeight: 500 }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={5}
                maxLength={5}
                pattern="\d{5}"
                title="Password must be exactly 5 digits"
                className="w-full rounded-lg border border-input bg-input-bg px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-60"
              style={{ fontWeight: 500 }}
            >
              {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>New here? <button onClick={() => setMode("signup")} className="text-primary hover:underline" style={{ fontWeight: 500 }}>Create an account</button></>
            ) : (
              <>Have an account? <button onClick={() => setMode("signin")} className="text-primary hover:underline" style={{ fontWeight: 500 }}>Sign in</button></>
            )}
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          The first account created becomes the workspace admin.
        </p>
      </div>
    </div>
  );
}
