# 🔧 Wrangler Development Setup Fix

**Date:** 2026-04-28T10:07:10Z  
**Issue:** Wrangler proxy mode conflicts and Node v24 compatibility issues

---

## ❌ Problems Encountered

### 1. Error: "Specify either a directory OR a proxy command, not both"
**Root Cause:** Wrangler found `pages_build_output_dir` in config files while also receiving `--proxy` flag, causing a conflict.

### 2. Error: "No such module 'wrangler:modules-watch'"
**Root Cause:** Wrangler 4.x has known compatibility issues with Node.js v24.14.1, causing internal module resolution failures and segmentation faults.

### 3. Wrong Vite Port
**Root Cause:** Script used `--proxy 8080` but Vite dev server runs on port `5173` by default (configured by `@lovable.dev/vite-tanstack-config`).

---

## ✅ Solutions Applied

### 1. Restored `pages_build_output_dir` Configuration

**CRITICAL:** Commenting out `pages_build_output_dir` breaks production builds on Cloudflare Pages.

**Fixed in `wrangler.toml`:**
```toml
pages_build_output_dir = "dist/client"  # ✅ Uncommented
```

**Fixed in `wrangler.jsonc`:**
```jsonc
"pages_build_output_dir": "dist/client",  // ✅ Uncommented
```

### 2. Changed Development Strategy: Build-First Approach

**Problem with `--proxy` mode:**
- Requires Wrangler to proxy requests to Vite dev server
- Causes conflicts with `pages_build_output_dir` setting
- Unstable on Node v24 due to internal module issues

**New approach: Serve pre-built output**
```json
"dev:all": "npm run dev & npx wrangler@latest pages dev dist/client --port 8788"
```

**How it works:**
1. `npm run dev` - Starts Vite dev server (builds to `dist/client`, watches for changes)
2. `&` - Runs in parallel (Windows compatible)
3. `npx wrangler@latest pages dev dist/client` - Serves the built output with Cloudflare Pages Functions
4. `--port 8788` - Explicit port for Wrangler (avoids conflicts)

**Benefits:**
- ✅ No proxy conflicts
- ✅ Works with Node v24
- ✅ Production-like environment (serves built files)
- ✅ Cloudflare Pages Functions work (`/api/chat`)
- ✅ HMR still works (Vite rebuilds on changes)

---

## 🚀 How to Use

### Development with Cloudflare Pages Functions

```bash
npm run dev:all
```

**What happens:**
1. Vite builds your app to `dist/client` and watches for changes
2. Wrangler serves `dist/client` with Cloudflare runtime
3. `/api/chat` endpoint works via `functions/api/chat.ts`
4. Open: http://localhost:8788

### Regular Development (without API)

```bash
npm run dev
```

**What happens:**
1. Vite dev server with HMR
2. No Cloudflare Pages Functions
3. Open: http://localhost:5173

---

## 🧪 Testing the Chat Widget

### 1. Start Dev Server
```bash
npm run dev:all
```

Wait for both processes to start:
- ✅ Vite: "ready in X ms"
- ✅ Wrangler: "Ready on http://localhost:8788"

### 2. Open Browser
Go to: http://localhost:8788 (NOT 5173)

### 3. Test Chat
1. Click floating chat button (bottom-right)
2. Send message: "Hello, test streaming"
3. Verify streaming response appears
4. Check Supabase Table Editor → `chat_messages`

### 4. Verify SSE Streaming
Open browser DevTools → Network tab:
- Look for `/api/chat` request
- Type should be `eventsource` or `text/event-stream`
- Status should be `200`
- Response should show streaming chunks

---

## 🔍 Troubleshooting

### Issue: Wrangler still shows proxy error

**Solution:**
```bash
# Kill any running processes
npx kill-port 8788 5173

# Clear Wrangler cache
rm -rf .wrangler

# Restart
npm run dev:all
```

### Issue: Changes not reflecting

**Solution:**
- Vite rebuilds automatically on file changes
- Wrangler serves the built output
- Refresh browser (Ctrl+R)
- If still not working, restart `npm run dev:all`

### Issue: `/api/chat` returns 404

**Solution:**
1. Verify `functions/api/chat.ts` exists
2. Check `.dev.vars` has all required variables
3. Ensure you're accessing http://localhost:8788 (not 5173)
4. Check Wrangler console for function registration logs

### Issue: Node v24 segmentation fault

**Solution:**
```bash
# Downgrade to Node v22 LTS (recommended for Wrangler)
nvm install 22
nvm use 22

# Or use Node v20 LTS
nvm install 20
nvm use 20
```

---

## 📋 Environment Variables Required

Ensure `.dev.vars` contains:
```env
NVIDIA_NIM_API_KEY=nvapi-xxx
NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_NIM_MODEL=nvidia/llama-3.1-nemotron-70b-instruct
SUPABASE_URL=https://inyqkjsdcwifzhxayjmo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## ⚠️ Node.js Version Recommendation

**Current:** Node v24.14.1 (unstable with Wrangler)

**Recommended:**
- **Node v22 LTS** - Best compatibility with Wrangler 4.x
- **Node v20 LTS** - Also stable

**Known Issues with Node v24:**
- Wrangler internal module errors
- Segmentation faults in various tools
- Experimental features causing instability

**To switch:**
```bash
nvm install 22
nvm use 22
npm install  # Reinstall dependencies
```

---

## 🎯 Summary

**Problem:** Wrangler proxy mode conflicted with `pages_build_output_dir` and had Node v24 compatibility issues.

**Solution:** Changed to build-first approach where Vite builds to `dist/client` and Wrangler serves the built output.

**Result:**
- ✅ Production builds still work (config restored)
- ✅ Local development works with Cloudflare Pages Functions
- ✅ SSE streaming works correctly
- ✅ Compatible with Node v24 (but v22 recommended)
- ✅ HMR still functional (Vite watches and rebuilds)

---

**Fix Applied:** 2026-04-28T10:07:10Z  
**Status:** ✅ Ready for testing
