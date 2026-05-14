import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Workflow,
  Sparkles,
  Mail,
  BarChart3,
  CheckSquare,
  Users,
  Star,
  UserPlus,
  Settings2,
  Rocket,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "CRM360 — The modern CRM for growing teams" },
      {
        name: "description",
        content:
          "CRM360 unifies pipeline, AI email, Gmail sync, reports and tasks in one fast, modern workspace.",
      },
      { property: "og:title", content: "CRM360 — The modern CRM for growing teams" },
      {
        property: "og:description",
        content:
          "Pipeline, AI email, Gmail sync, reports and tasks — one modern CRM for HR, Ops and Sales.",
      },
    ],
  }),
  component: WelcomePage,
});

// Neutral, global SaaS palette (independent of app theme)
const C = {
  bg: "#ffffff",
  surface: "#f8fafc",
  border: "#e5e7eb",
  text: "#0b1220",
  muted: "#5b6473",
  accent: "#4f46e5",
  accentHover: "#4338ca",
  accentSoft: "#eef2ff",
  dark: "#0b1220",
};

function WelcomePage() {
  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }} className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <LogoStrip />
        <Features />
        <HowItWorks />
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header
      className="sticky top-0 z-40 backdrop-blur"
      style={{ background: "rgba(255,255,255,0.8)", borderBottom: `1px solid ${C.border}` }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/welcome" className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
            style={{ background: C.dark, fontWeight: 700 }}
          >
            C
          </span>
          <span style={{ fontWeight: 700, color: C.text }}>CRM360</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm md:flex" style={{ color: C.muted }}>
          <a href="#features" className="hover:opacity-80 transition">Features</a>
          <a href="#how" className="hover:opacity-80 transition">How it works</a>
          <a href="#testimonials" className="hover:opacity-80 transition">Customers</a>
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <button
            onClick={() => setOpen(true)}
            className="rounded-md px-4 py-2 text-sm transition"
            style={{ color: C.text, fontWeight: 500 }}
          >
            Book a demo
          </button>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm text-white transition"
            style={{ background: C.accent, fontWeight: 500 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.accentHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = C.accent)}
          >
            Get started <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <Link
          to="/login"
          className="rounded-md px-4 py-2 text-sm text-white md:hidden"
          style={{ background: C.accent, fontWeight: 500 }}
        >
          Get started
        </Link>
      </div>
      {open && <DemoDialog onClose={() => setOpen(false)} />}
    </header>
  );
}

function Hero() {
  const [demoOpen, setDemoOpen] = useState(false);
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 70% -10%, #eef2ff 0%, transparent 60%), radial-gradient(40% 35% at 0% 10%, #f5f3ff 0%, transparent 60%)",
        }}
      />
      <div className="mx-auto max-w-6xl px-5 py-20 text-center md:py-28">
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs"
          style={{ border: `1px solid ${C.border}`, color: C.muted, fontWeight: 500, background: C.bg }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: C.accent }} />
          New · AI email writer is live
        </span>
        <h1
          className="mx-auto mt-6 max-w-3xl text-4xl leading-[1.05] tracking-tight md:text-6xl"
          style={{ fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}
        >
          The modern CRM your team will actually use.
        </h1>
        <p
          className="mx-auto mt-5 max-w-xl text-base md:text-lg"
          style={{ color: C.muted }}
        >
          CRM360 unifies pipeline, AI email, Gmail sync, reports and tasks in one fast workspace —
          built for HR, Ops and Sales teams.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-md px-5 py-3 text-sm text-white transition"
            style={{ background: C.accent, fontWeight: 500 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.accentHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = C.accent)}
          >
            Get started — it's free <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            onClick={() => setDemoOpen(true)}
            className="inline-flex items-center gap-2 rounded-md px-5 py-3 text-sm transition"
            style={{ border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontWeight: 500 }}
          >
            Book a demo
          </button>
        </div>
        <p className="mt-4 text-xs" style={{ color: C.muted }}>
          No credit card required · 14-day free trial
        </p>

        <div className="mt-16">
          <HeroPreview />
        </div>
      </div>
      {demoOpen && <DemoDialog onClose={() => setDemoOpen(false)} />}
    </section>
  );
}

function HeroPreview() {
  return (
    <div
      className="mx-auto max-w-5xl overflow-hidden rounded-xl text-left"
      style={{
        border: `1px solid ${C.border}`,
        boxShadow: "0 30px 60px -20px rgba(15, 23, 42, 0.18), 0 10px 25px -10px rgba(15, 23, 42, 0.08)",
        background: C.bg,
      }}
    >
      {/* window chrome */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}
      >
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ef4444" }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#f59e0b" }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#10b981" }} />
        <span className="ml-3 text-xs" style={{ color: C.muted }}>app.crm360.com / pipeline</span>
      </div>
      <div className="grid gap-0 md:grid-cols-[200px_1fr]">
        {/* sidebar */}
        <aside className="hidden p-4 md:block" style={{ background: C.surface, borderRight: `1px solid ${C.border}` }}>
          {["Dashboard", "Pipeline", "Inbox", "Tasks", "Reports"].map((item, i) => (
            <div
              key={item}
              className="mb-1 rounded-md px-3 py-2 text-sm"
              style={{
                background: i === 1 ? C.accentSoft : "transparent",
                color: i === 1 ? C.accent : C.muted,
                fontWeight: i === 1 ? 600 : 500,
              }}
            >
              {item}
            </div>
          ))}
        </aside>
        {/* board */}
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs" style={{ color: C.muted, fontWeight: 500 }}>Pipeline</p>
              <p className="text-base" style={{ fontWeight: 600 }}>Q4 deals</p>
            </div>
            <span
              className="rounded-full px-2.5 py-1 text-xs"
              style={{ background: C.surface, color: C.muted, fontWeight: 500 }}
            >
              12 active
            </span>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { label: "New", count: 4 },
              { label: "Qualified", count: 5 },
              { label: "Won", count: 3 },
            ].map((c, i) => (
              <div
                key={c.label}
                className="rounded-lg p-3"
                style={{ border: `1px solid ${C.border}`, background: i === 2 ? C.accentSoft : C.bg }}
              >
                <p className="text-[11px]" style={{ color: C.muted, fontWeight: 500 }}>{c.label}</p>
                <p className="mt-1 text-xl" style={{ color: C.text, fontWeight: 700 }}>{c.count}</p>
                <div className="mt-2 h-1 w-full rounded-full" style={{ background: C.surface }}>
                  <div
                    className="h-1 rounded-full"
                    style={{ width: `${20 + i * 25}%`, background: i === 2 ? C.accent : "#cbd5e1" }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-2">
            {[
              { name: "Acme Co.", value: "$24,000", who: "AB" },
              { name: "Northwind", value: "$18,500", who: "MK" },
              { name: "Globex", value: "$9,200", who: "JR" },
            ].map((row) => (
              <div
                key={row.name}
                className="flex items-center justify-between rounded-md px-3 py-2.5"
                style={{ border: `1px solid ${C.border}`, background: C.bg }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] text-white"
                    style={{ background: C.accent, fontWeight: 600 }}
                  >
                    {row.who}
                  </span>
                  <span className="text-sm" style={{ fontWeight: 500 }}>{row.name}</span>
                </div>
                <span className="text-sm" style={{ color: C.muted, fontWeight: 500 }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LogoStrip() {
  const logos = ["Acme", "Northwind", "Globex", "Initech", "Umbrella", "Stark"];
  return (
    <section style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: C.surface }}>
      <div className="mx-auto max-w-6xl px-5 py-10">
        <p className="text-center text-xs uppercase tracking-wider" style={{ color: C.muted, fontWeight: 600 }}>
          Trusted by teams at
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70">
          {logos.map((l) => (
            <span key={l} className="text-lg" style={{ color: C.text, fontWeight: 700, letterSpacing: "-0.02em" }}>
              {l}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  { icon: Workflow, title: "Visual pipeline", body: "Drag deals through stages, see what's stuck, and forecast at a glance." },
  { icon: Sparkles, title: "AI email writer", body: "Generate on-brand replies in seconds — never start from a blank page." },
  { icon: Mail, title: "Gmail sync", body: "Two-way sync keeps every conversation tied to the right contact and deal." },
  { icon: BarChart3, title: "Reports & analytics", body: "Lead source, conversion and revenue dashboards designed to be readable." },
  { icon: CheckSquare, title: "Tasks & documents", body: "Follow-ups, contracts and notes live next to the people they belong to." },
  { icon: Users, title: "Roles & permissions", body: "Give HR, Ops and Sales the right access — no spreadsheets, no surprises." },
];

function Features() {
  return (
    <section id="features" style={{ background: C.bg }}>
      <div className="mx-auto max-w-6xl px-5 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs uppercase tracking-wider" style={{ color: C.accent, fontWeight: 700 }}>
            Features
          </span>
          <h2 className="mt-3 text-3xl tracking-tight md:text-4xl" style={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
            Everything your team needs in one place.
          </h2>
          <p className="mt-3" style={{ color: C.muted }}>
            Six powerful tools, designed to work together — not against you.
          </p>
        </div>
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl" style={{ background: C.border }}>
          <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3" style={{ background: C.border }}>
            {FEATURES.map((f) => (
              <div key={f.title} className="p-7" style={{ background: C.bg }}>
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ background: C.accentSoft, color: C.accent }}
                >
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-base" style={{ fontWeight: 600 }}>{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: C.muted }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { icon: UserPlus, title: "Create your workspace", body: "Sign up in under a minute — no setup call required." },
  { icon: Settings2, title: "Connect your tools", body: "Sync Gmail, import contacts, and shape the pipeline to fit your team." },
  { icon: Rocket, title: "Run your day from one place", body: "Move deals, draft emails with AI, log tasks — all in CRM360." },
];

function HowItWorks() {
  return (
    <section id="how" style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <div className="mx-auto max-w-6xl px-5 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs uppercase tracking-wider" style={{ color: C.accent, fontWeight: 700 }}>
            How it works
          </span>
          <h2 className="mt-3 text-3xl tracking-tight md:text-4xl" style={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
            Up and running in three steps.
          </h2>
        </div>
        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              className="rounded-xl p-7"
              style={{ background: C.bg, border: `1px solid ${C.border}` }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm text-white"
                  style={{ background: C.dark, fontWeight: 600 }}
                >
                  {i + 1}
                </span>
                <s.icon className="h-5 w-5" style={{ color: C.muted }} />
              </div>
              <h3 className="mt-5 text-base" style={{ fontWeight: 600 }}>{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: C.muted }}>{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const QUOTES = [
  { quote: "CRM360 replaced three tools and a shared spreadsheet. Our reps actually log their calls now.", name: "Maya Patel", role: "Head of Sales, Northwind" },
  { quote: "The AI email writer alone saves our team an hour a day. Setup took twenty minutes.", name: "Daniel Okafor", role: "Operations Lead, Globex" },
  { quote: "We onboarded the whole HR team in an afternoon. Roles and permissions just made sense.", name: "Sara Lindqvist", role: "People Partner, Acme Co." },
];

function Testimonials() {
  return (
    <section id="testimonials" style={{ background: C.bg }}>
      <div className="mx-auto max-w-6xl px-5 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs uppercase tracking-wider" style={{ color: C.accent, fontWeight: 700 }}>
            Loved by teams
          </span>
          <h2 className="mt-3 text-3xl tracking-tight md:text-4xl" style={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
            What our customers are saying.
          </h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {QUOTES.map((q) => (
            <figure
              key={q.name}
              className="rounded-xl p-7"
              style={{ border: `1px solid ${C.border}`, background: C.bg }}
            >
              <div className="flex gap-0.5" style={{ color: "#f59e0b" }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <blockquote className="mt-4 text-sm leading-relaxed" style={{ color: C.text }}>
                "{q.quote}"
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-xs text-white"
                  style={{ background: C.dark, fontWeight: 600 }}
                >
                  {q.name.split(" ").map((n) => n[0]).join("")}
                </span>
                <div>
                  <p className="text-sm" style={{ fontWeight: 600 }}>{q.name}</p>
                  <p className="text-xs" style={{ color: C.muted }}>{q.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  const [demoOpen, setDemoOpen] = useState(false);
  const bullets = ["Free 14-day trial", "No credit card required", "Cancel anytime"];
  return (
    <section style={{ background: C.bg, borderTop: `1px solid ${C.border}` }}>
      <div className="mx-auto max-w-6xl px-5 py-20">
        <div
          className="relative overflow-hidden rounded-2xl p-10 text-center md:p-16"
          style={{ background: C.dark, color: "#ffffff" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 80% at 50% 0%, rgba(79,70,229,0.35) 0%, transparent 70%)",
            }}
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl tracking-tight md:text-5xl" style={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
              Ready to give your team a CRM they'll love?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm md:text-base" style={{ color: "#cbd5e1" }}>
              Join thousands of teams running their pipeline, inbox and reports in one place.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-md px-5 py-3 text-sm text-white transition"
                style={{ background: C.accent, fontWeight: 500 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.accentHover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = C.accent)}
              >
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={() => setDemoOpen(true)}
                className="inline-flex items-center gap-2 rounded-md px-5 py-3 text-sm transition"
                style={{ background: "rgba(255,255,255,0.1)", color: "#fff", fontWeight: 500, border: "1px solid rgba(255,255,255,0.2)" }}
              >
                Book a demo
              </button>
            </div>
            <ul className="mx-auto mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs" style={{ color: "#cbd5e1" }}>
              {bullets.map((b) => (
                <li key={b} className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" style={{ color: C.accent }} /> {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      {demoOpen && <DemoDialog onClose={() => setDemoOpen(false)} />}
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ background: C.bg, borderTop: `1px solid ${C.border}` }}>
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-5 py-10 text-sm md:flex-row md:items-center" style={{ color: C.muted }}>
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md text-xs text-white"
            style={{ background: C.dark, fontWeight: 700 }}
          >
            C
          </span>
          <span style={{ fontWeight: 600, color: C.text }}>CRM360</span>
          <span className="ml-2">© {new Date().getFullYear()}</span>
        </div>
        <div className="flex flex-wrap gap-6">
          <a href="#features" className="hover:opacity-80 transition">Features</a>
          <a href="#how" className="hover:opacity-80 transition">How it works</a>
          <a href="#testimonials" className="hover:opacity-80 transition">Customers</a>
          <Link to="/login" className="hover:opacity-80 transition">Sign in</Link>
        </div>
      </div>
    </footer>
  );
}

function DemoDialog({ onClose }: { onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(11,18,32,0.55)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl p-6"
        style={{ background: C.bg, border: `1px solid ${C.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <div className="py-4 text-center">
            <h3 className="text-lg" style={{ fontWeight: 600 }}>Thanks — we'll be in touch.</h3>
            <p className="mt-2 text-sm" style={{ color: C.muted }}>
              Someone from our team will reach out within one business day.
            </p>
            <button
              onClick={onClose}
              className="mt-5 rounded-md px-5 py-2 text-sm text-white"
              style={{ background: C.accent, fontWeight: 500 }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-lg" style={{ fontWeight: 600 }}>Book a demo</h3>
            <p className="mt-1 text-sm" style={{ color: C.muted }}>
              Tell us about your team and we'll set up a 20-minute walkthrough.
            </p>
            <form
              className="mt-5 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
            >
              {["Your name", "Work email", "Company"].map((ph, i) => (
                <input
                  key={ph}
                  required={i < 2}
                  type={i === 1 ? "email" : "text"}
                  placeholder={ph}
                  className="w-full rounded-md px-3 py-2.5 text-sm outline-none focus:ring-2"
                  style={{
                    border: `1px solid ${C.border}`,
                    background: C.bg,
                    color: C.text,
                  }}
                />
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md px-4 py-2 text-sm"
                  style={{ color: C.text, fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md px-4 py-2 text-sm text-white"
                  style={{ background: C.accent, fontWeight: 500 }}
                >
                  Request demo
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
