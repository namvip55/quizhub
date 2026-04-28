import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { AIChatWidget } from "@/components/chat";

import appCss from "../styles.css?url";

interface RouterContext {
  queryClient: QueryClient;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "QuizHub — Online Exams & Quiz Platform" },
      {
        name: "description",
        content:
          "QuizHub is a modern online exam platform for teachers and students. Create question banks, run timed exams, and analyze results.",
      },
      { property: "og:title", content: "QuizHub — Online Exams & Quiz Platform" },
      {
        property: "og:description",
        content: "Create, share, and take online exams with QuizHub.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  // #region agent log
  useEffect(() => {
    console.warn("[agent log]", {
      sessionId: "6e5d58",
      runId: "pre-fix",
      hypothesisId: "ROOT",
      location: "src/routes/__root.tsx:RootComponent",
      message: "RootComponent mounted",
    });

    fetch("/__agent_log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "6e5d58",
        runId: "pre-fix",
        hypothesisId: "ROOT",
        location: "src/routes/__root.tsx:RootComponent",
        message: "RootComponent mounted",
        data: {},
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }, []);
  // #endregion agent log

  return (
    <AuthProvider>
      {import.meta.env.DEV && (
        <div className="fixed left-2 top-2 z-[9999] rounded bg-black/70 px-2 py-1 text-xs text-white">
          agent-log active (6e5d58)
        </div>
      )}
      <Outlet />
      <Toaster richColors closeButton position="top-right" theme="dark" />
      <AIChatWidget />
    </AuthProvider>
  );
}
