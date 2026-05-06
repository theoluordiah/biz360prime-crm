import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { TrendingUp, Users, Sparkles, BarChart3 } from "lucide-react";
import heroImage from "@/assets/login-hero.jpg";

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
    <div className="min-h-screen flex bg-background">
      {/* Left: form */}
      <div className="flex-1 flex items-center justify-center px-4 py-10 lg:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Link to="/" className="text-3xl tracking-tight" style={{ color: "#e2725b", fontWeight: 500 }}>
              CRM360
            </Link>
            <h1 className="mt-6 text-2xl text-foreground" style={{ fontWeight: 500 }}>
              {mode === "signin"
                ? "Welcome back"
                : mode === "forgot"
                ? "Reset your password"
                : "Create your workspace"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Sign in to pick up where you left off."
                : mode === "forgot"
                ? "Enter your email and we'll send a reset link."
                : "Pick a username and password to get started."}
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
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
          <p className="text-center text-xs text-muted-foreground mt-6">
            {mode === "signin"
              ? "Admins can manage roles from Roles & Access after signing in."
              : "The first account created becomes the workspace admin."}
          </p>
        </div>
      </div>

      {/* Right: visual panel */}
      <div
        className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center p-10"
        style={{ background: "linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)" }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute -top-24 -left-20 w-96 h-96 rounded-full opacity-40"
          style={{ background: "radial-gradient(circle at 30% 30%, #ffffff, transparent 70%)" }}
          aria-hidden
        />
        <div
          className="absolute -bottom-32 -right-16 w-[28rem] h-[28rem] rounded-full opacity-30"
          style={{ background: "radial-gradient(circle at 60% 40%, #ffffff, transparent 70%)" }}
          aria-hidden
        />

        <div className="relative z-10 max-w-lg w-full">
          <div className="text-center mb-8">
            <h2
              className="text-3xl leading-tight"
              style={{ color: "#ffffff", fontWeight: 500 }}
            >
              Run sales, support &amp; ops from one warm, calm space.
            </h2>
            <p className="mt-3 text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
              Pipeline, contacts, AI email writer and reports — beautifully integrated.
            </p>
          </div>

          <div className="relative">
            <img
              src={heroImage}
              alt="CRM360 dashboard preview with charts and contacts"
              width={1024}
              height={1024}
              className="w-full h-auto rounded-2xl border border-white/60"
              style={{ boxShadow: "0 20px 60px -30px rgba(58,36,24,0.35)" }}
            />

            {/* Floating stat card — top left */}
            <div
              className="absolute -top-4 -left-4 bg-white rounded-xl px-4 py-3 border border-border flex items-center gap-3"
              style={{ boxShadow: "0 12px 30px -16px rgba(58,36,24,0.25)" }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "#ffe4d1", color: "#c95c47" }}
              >
                <TrendingUp size={18} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide" style={{ color: "#8a6a55" }}>
                  Won revenue
                </div>
                <div className="text-sm" style={{ color: "#3a2418", fontWeight: 600 }}>
                  +28% this month
                </div>
              </div>
            </div>

            {/* Floating stat card — bottom right */}
            <div
              className="absolute -bottom-5 -right-4 bg-white rounded-xl px-4 py-3 border border-border flex items-center gap-3"
              style={{ boxShadow: "0 12px 30px -16px rgba(58,36,24,0.25)" }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "#fdeede", color: "#c95c47" }}
              >
                <Users size={18} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide" style={{ color: "#8a6a55" }}>
                  Active contacts
                </div>
                <div className="text-sm" style={{ color: "#3a2418", fontWeight: 600 }}>
                  1,284
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-10">
            <Feature icon={<BarChart3 size={16} />} label="Live reports" />
            <Feature icon={<Sparkles size={16} />} label="AI email writer" />
            <Feature icon={<Users size={16} />} label="Team roles" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      className="flex items-center gap-2 bg-white/70 backdrop-blur rounded-lg px-3 py-2 border border-white/80"
      style={{ color: "#3a2418" }}
    >
      <span style={{ color: "#c95c47" }}>{icon}</span>
      <span className="text-xs" style={{ fontWeight: 500 }}>{label}</span>
    </div>
  );
}
