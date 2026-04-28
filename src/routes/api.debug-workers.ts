import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/debug-workers')({
  // @ts-ignore
  server: {
    handlers: {
      GET: async () => {
        try {
          // @ts-ignore
          const cf = await import('cloudflare:workers');
          return new Response(JSON.stringify({
            success: true,
            keys: Object.keys(cf.env || {}),
            env: cf.env
          }));
        } catch (e: any) {
          return new Response(JSON.stringify({
            success: false,
            error: e.message
          }));
        }
      }
    }
  }
});
