import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CRM360 — Modern CRM for HR, Ops & Sales" },
      { name: "description", content: "CRM360 — a soft, elegant CRM with pipeline, AI email writer, Gmail sync and Zoho integration." },
      { name: "author", content: "CRM360" },
      { property: "og:title", content: "CRM360 — Modern CRM for HR, Ops & Sales" },
      { property: "og:description", content: "CRM360 — a soft, elegant CRM with pipeline, AI email writer, Gmail sync and Zoho integration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "CRM360 — Modern CRM for HR, Ops & Sales" },
      { name: "twitter:description", content: "CRM360 — a soft, elegant CRM with pipeline, AI email writer, Gmail sync and Zoho integration." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/73ebced4-2304-41cd-b3c5-eab8ae0f9ecf/id-preview-3eddfd5e--ea6c4855-c588-46b9-b72c-1115ca14ba85.lovable.app-1776576253245.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/73ebced4-2304-41cd-b3c5-eab8ae0f9ecf/id-preview-3eddfd5e--ea6c4855-c588-46b9-b72c-1115ca14ba85.lovable.app-1776576253245.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl text-foreground" style={{ fontWeight: 500 }}>404</h1>
        <h2 className="mt-4 text-xl text-foreground" style={{ fontWeight: 500 }}>Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <a
            href="/dashboard"
            className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground hover:bg-primary-hover transition-colors"
            style={{ fontWeight: 500 }}
          >
            Go to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  }));
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
