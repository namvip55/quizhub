// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export default defineConfig({
  vite: {
    plugins: [
      {
        name: "agent-log-proxy",
        configureServer(server) {
          server.middlewares.use((req, _res, next) => {
            try {
              const url = req.url || "";
              if (url.startsWith("/dashboard/") || url.startsWith("/__agent_log")) {
                console.warn("[agent server]", { method: req.method, url });
              }
            } catch {
              // ignore
            }
            next();
          });

          server.middlewares.use("/__agent_log", async (req, res) => {
            if (req.method !== "POST") {
              res.statusCode = 405;
              res.end("Method Not Allowed");
              return;
            }

            try {
              const chunks: Buffer[] = [];
              await new Promise<void>((resolve, reject) => {
                req.on("data", (c) => chunks.push(Buffer.from(c)));
                req.on("end", () => resolve());
                req.on("error", (e) => reject(e));
              });

              const body = Buffer.concat(chunks).toString("utf-8");
              const logDir = path.join(process.cwd(), ".cursor");
              const logPath = path.join(logDir, "debug-6e5d58.log");
              console.warn("[agent log proxy] received", { bytes: body.length, logPath });
              await mkdir(logDir, { recursive: true });
              await appendFile(logPath, body.trim() + "\n", "utf-8");

              await fetch("http://127.0.0.1:7284/ingest/33d6aa58-1b7e-48a0-b5a8-33b54fe109ca", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Debug-Session-Id": "6e5d58",
                },
                body,
              });

              res.statusCode = 204;
              res.end();
            } catch (e) {
              console.warn("[agent log proxy] failed", { error: String(e), cwd: process.cwd() });
              res.statusCode = 204;
              res.end();
            }
          });
        },
      },
    ],
  },
});
