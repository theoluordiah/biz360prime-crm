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
} from "lucide-react";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "CRM360 — A warm, modern CRM for HR, Ops & Sales" },
      {
        name: "description",
        content:
          "CRM360 brings pipeline, AI email writer, Gmail sync, reports and tasks together in one calm, friendly workspace.",
      },
      { property: "og:title", content: "CRM360 — A warm, modern CRM for HR, Ops & Sales" },
      {
        property: "og:description",
        content:
          "Pipeline, AI email writer, Gmail sync, reports and tasks — together in one warm workspace.",
      },
    ],
  }),
  component: WelcomePage,
});

function WelcomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
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
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/welcome" className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
            style={{ fontWeight: 600 }}
          >
            C
          </span>
          <span className="text-base" style={{ fontWeight: 600 }}>
            CRM360
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#how" className="hover:text-foreground transition-colors">
            How it works
          </a>
          <a href="#testimonials" className="hover:text-foreground transition-colors">
            Customers
          </a>
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <button
            onClick={() => setOpen(true)}
            className="rounded-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            style={{ fontWeight: 500 }}
          >
            Book a demo
          </button>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary-hover transition-colors"
            style={{ fontWeight: 500 }}
          >
            Start free <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <Link
          to="/login"
          className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground md:hidden"
          style={{ fontWeight: 500 }}
        >
          Start free
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
            "radial-gradient(60% 50% at 80% 0%, #ffd9c0 0%, transparent 60%), radial-gradient(50% 40% at 0% 20%, #fdeede 0%, transparent 60%)",
        }}
      />
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:grid-cols-2 md:py-28">
        <div className="flex flex-col justify-center">
          <span
            className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground"
            style={{ fontWeight: 500 }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            CRM, but warm and human
          </span>
          <h1
            className="mt-5 text-4xl leading-[1.1] tracking-tight md:text-6xl"
            style={{ fontWeight: 600 }}
          >
            One calm workspace for HR, Ops and Sales.
          </h1>
          <p className="mt-5 max-w-lg text-base text-muted-foreground md:text-lg">
            CRM360 brings pipeline, AI email writer, Gmail sync, reports and tasks together — so
            your team spends less time switching tabs and more time helping customers.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground hover:bg-primary-hover transition-colors"
              style={{ fontWeight: 500 }}
            >
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={() => setDemoOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
              style={{ fontWeight: 500 }}
            >
              Book a demo
            </button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No credit card needed · Free to get started
          </p>
        </div>

        <HeroPreview />
      </div>
      {demoOpen && <DemoDialog onClose={() => setDemoOpen(false)} />}
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="relative">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground" style={{ fontWeight: 500 }}>
              Pipeline
            </p>
            <p className="text-lg" style={{ fontWeight: 600 }}>
              Q4 deals
            </p>
          </div>
          <span
            className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
            style={{ fontWeight: 500 }}
          >
            12 active
          </span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { label: "New", count: 4, tone: "#fdeede" },
            { label: "Qualified", count: 5, tone: "#ffd9c0" },
            { label: "Won", count: 3, tone: "#f5b7a3" },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-xl border border-border p-3"
              style={{ background: c.tone }}
            >
              <p className="text-[11px] text-[#8a6a55]" style={{ fontWeight: 500 }}>
                {c.label}
              </p>
              <p className="mt-1 text-xl text-[#3a2418]" style={{ fontWeight: 600 }}>
                {c.count}
              </p>
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
              className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5"
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-[11px] text-secondary-foreground"
                  style={{ fontWeight: 600 }}
                >
                  {row.who}
                </span>
                <span className="text-sm" style={{ fontWeight: 500 }}>
                  {row.name}
                </span>
              </div>
              <span className="text-sm text-muted-foreground" style={{ fontWeight: 500 }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div
        aria-hidden
        className="absolute -bottom-6 -left-6 hidden rounded-xl border border-border bg-card p-3 shadow-sm md:block"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs" style={{ fontWeight: 500 }}>
            AI drafted reply in 2s
          </span>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: Workflow,
    title: "Visual pipeline",
    body: "Drag deals through stages, see what's stuck, and forecast at a glance.",
  },
  {
    icon: Sparkles,
    title: "AI email writer",
    body: "Generate warm, on-brand replies in seconds — never start from a blank page.",
  },
  {
    icon: Mail,
    title: "Gmail sync",
    body: "Two-way sync keeps every conversation tied to the right contact and deal.",
  },
  {
    icon: BarChart3,
    title: "Reports that breathe",
    body: "Lead source, conversion and revenue dashboards designed to be readable.",
  },
  {
    icon: CheckSquare,
    title: "Tasks & documents",
    body: "Follow-ups, contracts and notes live next to the people they belong to.",
  },
  {
    icon: Users,
    title: "Roles & permissions",
    body: "Give HR, Ops and Sales the right access — no spreadsheets, no surprises.",
  },
];

function Features() {
  return (
    <section id="features" className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-24">
        <div className="max-w-2xl">
          <span className="text-xs uppercase tracking-wider text-primary" style={{ fontWeight: 600 }}>
            Features
          </span>
          <h2
            className="mt-3 text-3xl tracking-tight md:text-4xl"
            style={{ fontWeight: 600 }}
          >
            Everything your team needs, nothing they don't.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Six tools in one CRM, designed to feel calm instead of crowded.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border bg-background p-6 transition-colors hover:bg-muted"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-base" style={{ fontWeight: 600 }}>
                {f.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    icon: UserPlus,
    title: "Create your workspace",
    body: "Sign up with a username — you're inside in under a minute.",
  },
  {
    icon: Settings2,
    title: "Connect your tools",
    body: "Sync Gmail, import contacts, and shape the pipeline to fit your team.",
  },
  {
    icon: Rocket,
    title: "Run your day from one place",
    body: "Move deals, draft emails with AI, log tasks — all without leaving CRM360.",
  },
];

function HowItWorks() {
  return (
    <section id="how" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-24">
        <div className="max-w-2xl">
          <span className="text-xs uppercase tracking-wider text-primary" style={{ fontWeight: 600 }}>
            How it works
          </span>
          <h2 className="mt-3 text-3xl tracking-tight md:text-4xl" style={{ fontWeight: 600 }}>
            Up and running in three steps.
          </h2>
        </div>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <div className="flex items-center justify-between">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm"
                  style={{ fontWeight: 600 }}
                >
                  {i + 1}
                </span>
                <s.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="mt-5 text-base" style={{ fontWeight: 600 }}>
                {s.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const QUOTES = [
  {
    quote:
      "CRM360 replaced three tools and a shared spreadsheet. Our reps actually log their calls now.",
    name: "Maya Patel",
    role: "Head of Sales, Northwind",
  },
  {
    quote:
      "The AI email writer alone saves our ops team an hour a day. The interface is genuinely calming.",
    name: "Daniel Okafor",
    role: "Operations Lead, Globex",
  },
  {
    quote:
      "We onboarded the whole HR team in an afternoon. Roles and permissions just made sense.",
    name: "Sara Lindqvist",
    role: "People Partner, Acme Co.",
  },
];

function Testimonials() {
  return (
    <section id="testimonials" className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-24">
        <div className="max-w-2xl">
          <span className="text-xs uppercase tracking-wider text-primary" style={{ fontWeight: 600 }}>
            Loved by teams
          </span>
          <h2 className="mt-3 text-3xl tracking-tight md:text-4xl" style={{ fontWeight: 600 }}>
            Warm reviews from real teams.
          </h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {QUOTES.map((q) => (
            <figure
              key={q.name}
              className="rounded-2xl border border-border bg-background p-6"
            >
              <div className="flex gap-0.5 text-primary">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <blockquote className="mt-4 text-sm leading-relaxed text-foreground">
                "{q.quote}"
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs"
                  style={{ fontWeight: 600 }}
                >
                  {q.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
                <div>
                  <p className="text-sm" style={{ fontWeight: 600 }}>
                    {q.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{q.role}</p>
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
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-24">
        <div
          className="relative overflow-hidden rounded-3xl border border-border p-10 md:p-14"
          style={{
            background:
              "linear-gradient(135deg, #ffd9c0 0%, #f5b7a3 60%, #e2725b 130%)",
          }}
        >
          <div className="max-w-2xl">
            <h2
              className="text-3xl tracking-tight text-[#3a2418] md:text-4xl"
              style={{ fontWeight: 600 }}
            >
              Give your team a CRM they actually want to open.
            </h2>
            <p className="mt-3 text-[#5a3a28]">
              Start free in under a minute, or book a guided tour with our team.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full bg-[#3a2418] px-5 py-2.5 text-sm text-white hover:bg-[#22140c] transition-colors"
                style={{ fontWeight: 500 }}
              >
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={() => setDemoOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-[#3a2418]/20 bg-white px-5 py-2.5 text-sm text-[#3a2418] hover:bg-white/80 transition-colors"
                style={{ fontWeight: 500 }}
              >
                Book a demo
              </button>
            </div>
          </div>
        </div>
      </div>
      {demoOpen && <DemoDialog onClose={() => setDemoOpen(false)} />}
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-5 py-10 text-sm text-muted-foreground md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs"
            style={{ fontWeight: 600 }}
          >
            C
          </span>
          <span style={{ fontWeight: 500 }} className="text-foreground">
            CRM360
          </span>
          <span className="ml-2">© {new Date().getFullYear()}</span>
        </div>
        <div className="flex flex-wrap gap-6">
          <a href="#features" className="hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#how" className="hover:text-foreground transition-colors">
            How it works
          </a>
          <a href="#testimonials" className="hover:text-foreground transition-colors">
            Customers
          </a>
          <Link to="/login" className="hover:text-foreground transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}

function DemoDialog({ onClose }: { onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#3a2418]/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <div className="py-4 text-center">
            <h3 className="text-lg" style={{ fontWeight: 600 }}>
              Thanks — we'll be in touch.
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Someone from our team will reach out within one business day.
            </p>
            <button
              onClick={onClose}
              className="mt-5 rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground"
              style={{ fontWeight: 500 }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-lg" style={{ fontWeight: 600 }}>
              Book a demo
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Tell us a little about your team and we'll set up a 20-minute walkthrough.
            </p>
            <form
              className="mt-5 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
            >
              <input
                required
                placeholder="Your name"
                className="w-full rounded-lg border border-input bg-input-bg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                required
                type="email"
                placeholder="Work email"
                className="w-full rounded-lg border border-input bg-input-bg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                placeholder="Company"
                className="w-full rounded-lg border border-input bg-input-bg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full px-4 py-2 text-sm hover:bg-muted"
                  style={{ fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary-hover"
                  style={{ fontWeight: 500 }}
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
