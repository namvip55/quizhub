# Cloudflare Workers Environment Variables Fix

## Vấn đề đã được giải quyết

### 1. **Truy cập biến môi trường Cloudflare Workers**

**Vấn đề:** `process.env` không hoạt động trên Cloudflare Workers vì Workers không có Node.js process object.

**Giải pháp:** Sử dụng `context` parameter được truyền vào handler:

```typescript
POST: async ({ request, context }) => {
  // context.env chứa tất cả Secrets và Vars từ Cloudflare
  const apiKey = context?.env?.NVIDIA_NIM_API_KEY;
}
```

### 2. **Helper function `getEnvVar()` với priority order**

```typescript
function getEnvVar(name: string, context?: any): string | undefined {
  // 1. Cloudflare Workers context (Production)
  if (context?.env?.[name]) return context.env[name];
  
  // 2. Cloudflare global env (Worker runtime)
  if (globalThis.env?.[name]) return globalThis.env[name];
  
  // 3. Node.js process.env (Local dev)
  if (process.env?.[name]) return process.env[name];
  
  // 4. Vite import.meta.env (Build-time)
  if (import.meta.env?.[name]) return import.meta.env[name];
  
  return undefined;
}
```

### 3. **Streaming SSE Headers cho Cloudflare**

Headers được tối ưu để tránh buffering:

```typescript
return new Response(sseStream, {
  headers: {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable proxy buffering
  },
});
```

## Cấu hình Cloudflare Workers

### wrangler.jsonc

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "quizhub",
  "compatibility_date": "2024-09-23",
  "pages_build_output_dir": "dist/client",
  "compatibility_flags": ["nodejs_compat"],
  "vars": {
    "NVIDIA_NIM_BASE_URL": "https://integrate.api.nvidia.com/v1",
    "NVIDIA_NIM_MODEL": "deepseek-ai/deepseek-v4-pro",
    "SUPABASE_URL": "https://inyqkjsdcwifzhxayjmo.supabase.co",
    "VITE_SUPABASE_URL": "https://inyqkjsdcwifzhxayjmo.supabase.co",
    "VITE_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_hpU3c24J9ONK2eN-cIN0pQ_VhWDmjY3"
  },
  "main": "@tanstack/react-start/server-entry"
}
```

### Thêm Secret (NVIDIA_NIM_API_KEY)

**Qua Cloudflare Dashboard:**
1. Vào Workers & Pages → quizhub → Settings → Variables
2. Thêm Secret: `NVIDIA_NIM_API_KEY` = `nvapi-xxxxx`
3. Deploy lại

**Qua Wrangler CLI:**
```bash
npx wrangler secret put NVIDIA_NIM_API_KEY
# Nhập API key khi được hỏi
```

## Cách hoạt động

### Local Development (npm run dev)
- Sử dụng `process.env` từ file `.env`
- Không cần Cloudflare context

### Production (Cloudflare Workers)
- TanStack Start truyền `context` vào handler
- `context.env` chứa tất cả Secrets và Vars
- `getEnvVar()` tự động detect và lấy từ `context.env`

## Testing

### Local
```bash
npm run dev
curl -X POST http://localhost:8097/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test","stream":true}'
```

### Production
```bash
npm run build
npx wrangler deploy

curl -X POST https://quizhub.pages.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test","stream":true}'
```

## Debug Tips

### Kiểm tra env vars có được load không:

File đã có logging:
```typescript
console.error('Missing NVIDIA environment variables:', {
  hasApiKey: !!apiKey,
  hasBaseUrl: !!baseUrl,
  hasModel: !!model,
  contextKeys: context ? Object.keys(context) : 'no context',
  isCloudflare: typeof globalThis !== 'undefined' && 'env' in globalThis
});
```

### Xem logs trên Cloudflare:
```bash
npx wrangler tail
```

Hoặc vào Dashboard → Workers & Pages → quizhub → Logs

## Key Changes trong api.chat.ts

1. **Handler signature:** `POST: async ({ request, context }) =>` (thêm `context`)
2. **Env access:** `getEnvVar('NVIDIA_NIM_API_KEY', context)` (truyền context)
3. **Error handling:** Trả về thông báo rõ ràng khi thiếu env vars
4. **Isomorphic:** Hoạt động cả Local (Node.js) và Production (Cloudflare Workers)

## Tại sao giải pháp này hoạt động?

### TanStack Start + Cloudflare Workers
- TanStack Start sử dụng Nitro/Vinxi để build
- Khi deploy lên Cloudflare, Nitro tạo Worker entry point
- Worker entry point nhận `env` object từ Cloudflare runtime
- TanStack Start truyền `env` vào handler qua `context` parameter

### Handler Context Structure
```typescript
{
  request: Request,
  context: {
    env: {
      NVIDIA_NIM_API_KEY: "nvapi-xxxxx",
      NVIDIA_NIM_BASE_URL: "https://...",
      NVIDIA_NIM_MODEL: "deepseek-ai/deepseek-v4-pro",
      // ... other vars and secrets
    },
    // ... other Cloudflare bindings (KV, D1, R2, etc.)
  }
}
```

## Kết luận

Giải pháp này:
- ✅ Hoạt động trên cả Local và Production
- ✅ Không cần import `cloudflare:workers` (tránh lỗi build local)
- ✅ Tương thích với TanStack Start v1.167
- ✅ Hỗ trợ SSE streaming không bị buffer
- ✅ Error handling rõ ràng với logging chi tiết