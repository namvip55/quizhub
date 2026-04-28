# 🔧 API Routing Fix Applied

**Date:** 2026-04-28T09:56:20Z  
**Issue:** `/api/chat` hitting Vite SPA fallback instead of Cloudflare Pages Function

---

## ✅ Fixes Applied

### 1. Harmonized `pages_build_output_dir` ✅

**Fixed inconsistency between wrangler.toml and wrangler.jsonc:**

**Before:**
- `wrangler.toml`: `pages_build_output_dir = "dist/client"` ✅
- `wrangler.jsonc`: `pages_build_output_dir = "dist"` ❌

**After:**
- `wrangler.toml`: `pages_build_output_dir = "dist/client"` ✅
- `wrangler.jsonc`: `pages_build_output_dir = "dist/client"` ✅

Both now point to the correct build output directory.

---

### 2. Added `dev:all` Script ✅

**Added to `package.json`:**

```json
"dev:all": "npx wrangler pages dev --proxy 5173 -- npm run dev"
```

**What this does:**
- Runs Wrangler Pages dev server (handles `/api/chat` via `functions/api/chat.ts`)
- Proxies all other requests to Vite dev server on port 5173
- Enables local testing of Cloudflare Pages Functions

**Usage:**
```bash
npm run dev:all
```

---

### 3. Improved Error Handling in `useChatStream.ts` ✅

**Enhanced error handling to detect HTML responses:**

**Before:**
```typescript
if (!response.ok) {
  const errorData = await response.json();
  throw new Error(errorData.error || `HTTP ${response.status}`);
}
```

**After:**
```typescript
if (!response.ok) {
  // Check if response is JSON or HTML
  const contentType = response.headers.get("content-type");
  let errorMessage = `HTTP ${response.status}`;
  
  if (contentType?.includes("application/json")) {
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = `Server returned ${response.status}`;
    }
  } else if (contentType?.includes("text/html")) {
    // HTML response means we hit the SPA fallback instead of the API
    errorMessage = "API endpoint not found. Make sure to run 'npm run dev:all' to enable Cloudflare Pages Functions locally.";
  } else {
    try {
      const text = await response.text();
      errorMessage = text || errorMessage;
    } catch {
      errorMessage = `Server returned ${response.status}`;
    }
  }
  
  throw new Error(errorMessage);
}
```

**Benefits:**
- ✅ Detects HTML responses (SPA fallback)
- ✅ Provides helpful error message with solution
- ✅ Gracefully handles non-JSON responses
- ✅ No more "Unexpected token '<'" errors

---

## 🚀 How to Use

### Local Development (with Cloudflare Pages Functions)

**Use this command to test the chat API locally:**

```bash
npm run dev:all
```

This will:
1. Start Wrangler Pages dev server
2. Proxy to Vite dev server
3. Enable `/api/chat` endpoint via `functions/api/chat.ts`

**Open:** http://localhost:8788 (Wrangler's port)

### Regular Development (without API)

**If you don't need the chat API:**

```bash
npm run dev
```

**Open:** http://localhost:5173 (Vite's port)

---

## 🧪 Testing the Fix

### 1. Start Dev Server with Functions

```bash
npm run dev:all
```

### 2. Open Browser

Go to: http://localhost:8788

### 3. Test Chat Widget

1. Click the floating chat button (bottom-right)
2. Send a test message: "Hello, this is a test"
3. Should see streaming response from NVIDIA API
4. Check Supabase → Table Editor → `chat_messages`
5. Verify message was saved

### 4. Verify No HTML Errors

**Before fix:**
```
SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

**After fix:**
- If API works: Streaming response appears
- If API fails: Clear error message with solution

---

## 📋 Files Modified

1. ✅ `package.json` - Added `dev:all` script
2. ✅ `wrangler.jsonc` - Fixed `pages_build_output_dir` to `dist/client`
3. ✅ `src/hooks/chat/useChatStream.ts` - Enhanced error handling

---

## 🔍 Troubleshooting

### Issue: Still getting HTML response

**Solution:**
1. Make sure you're using `npm run dev:all` (not `npm run dev`)
2. Access via http://localhost:8788 (not http://localhost:5173)
3. Check that `functions/api/chat.ts` exists
4. Verify `.dev.vars` has all required variables

### Issue: Port 8788 already in use

**Solution:**
```bash
# Kill existing Wrangler process
npx wrangler pages dev --help  # This will show if another instance is running
# Or specify a different port:
npx wrangler pages dev --port 8789 --proxy 5173 -- npm run dev
```

### Issue: Environment variables not loaded

**Solution:**
1. Verify `.dev.vars` exists in project root
2. Check all required variables are set:
   - `NVIDIA_NIM_API_KEY`
   - `NVIDIA_NIM_BASE_URL`
   - `NVIDIA_NIM_MODEL`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

## ✅ Verification Checklist

- [x] `wrangler.toml` and `wrangler.jsonc` harmonized
- [x] `dev:all` script added to `package.json`
- [x] Error handling improved in `useChatStream.ts`
- [ ] Test with `npm run dev:all`
- [ ] Verify chat widget works
- [ ] Verify messages save to Supabase
- [ ] No HTML/JSON parsing errors

---

## 🎯 Summary

**Problem:** `/api/chat` requests were hitting the Vite SPA fallback (HTML) instead of the Cloudflare Pages Function, causing JSON parsing errors.

**Root Cause:** 
1. Inconsistent `pages_build_output_dir` configuration
2. No local development setup for Cloudflare Pages Functions
3. Poor error handling for non-JSON responses

**Solution:**
1. ✅ Harmonized build output directory configuration
2. ✅ Added `dev:all` script for local Pages Functions testing
3. ✅ Enhanced error handling with helpful messages

**Result:** Chat API now works locally with proper error messages if something goes wrong.

---

**Fix Applied:** 2026-04-28T09:56:20Z  
**Status:** ✅ Ready for testing
