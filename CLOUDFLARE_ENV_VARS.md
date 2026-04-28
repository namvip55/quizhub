# Cloudflare Pages - Environment Variables Configuration

**For Production Deployment of AI Chatbot**  
**Date:** 2026-04-28

---

## Required Environment Variables

Based on the code in `functions/api/chat.ts`, here are **ALL** environment variables you need to configure in Cloudflare Dashboard:

| # | Key Name | Value Source | Mark as Secret? | Notes |
|---|----------|--------------|-----------------|-------|
| 1 | `NVIDIA_NIM_API_KEY` | NVIDIA Dashboard → API Keys | ✅ **YES** | Your API key: `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` |
| 2 | `NVIDIA_NIM_BASE_URL` | Fixed value | ❌ No | `https://integrate.api.nvidia.com/v1` |
| 3 | `NVIDIA_NIM_MODEL` | Fixed value | ❌ No | `deepseek-ai/deepseek-v4-pro` |
| 4 | `SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL | ❌ No | Format: `https://your-project-id.supabase.co` |
| 5 | `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → service_role key | ✅ **YES** | **NOT** the anon key - use service_role |

---

## Important Notes

### ✅ Confirmed: NO `VITE_` Prefix
These variables are for the **Cloudflare Pages Function (backend)** only. They do NOT need the `VITE_` prefix.

### 🔒 Security
- **Mark as Secret:** `NVIDIA_NIM_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY`
- These secrets will NEVER be exposed to the client bundle
- They are only accessible in the server-side function

### 📍 Where to Add These

**Cloudflare Dashboard:**
1. Go to **Pages** → Your project (e.g., "quizhub")
2. Click **Settings** → **Environment variables**
3. Select **Production** environment
4. Click **Add variable** for each row above
5. Paste the exact key name and value
6. Check **Encrypt** for secret variables (rows 1 and 5)

---

## Optional: Rate Limiting (KV Namespace)

If you want to enable rate limiting (10 requests/minute):

| Key Name | Value Source | Type |
|----------|--------------|------|
| `RATE_LIMIT_KV` | KV Namespace binding | KV Namespace Binding |

**How to set up:**
1. Create KV namespace: `npx wrangler kv:namespace create "RATE_LIMIT_KV"`
2. In Cloudflare Dashboard: Pages → Settings → Functions → **KV namespace bindings**
3. Variable name: `RATE_LIMIT_KV`
4. Select the namespace you created

**Note:** If you skip this, rate limiting will be disabled (all requests allowed).

---

## How to Get Each Value

### 1. NVIDIA_NIM_API_KEY
**Source:** NVIDIA Dashboard
- Go to https://build.nvidia.com/
- Sign in to your account
- Navigate to **API Keys** or **Account Settings**
- Copy your API key (starts with `nvapi-`)
- **Your key:** `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`

### 2. NVIDIA_NIM_BASE_URL
**Fixed value:** `https://integrate.api.nvidia.com/v1`

### 3. NVIDIA_NIM_MODEL
**Fixed value:** `deepseek-ai/deepseek-v4-pro`

### 4. SUPABASE_URL
**Source:** Supabase Dashboard
- Go to https://supabase.com/dashboard
- Select your project
- Go to **Settings** → **API**
- Copy **Project URL** (under "Project Configuration")
- Format: `https://xxxxxxxxxxxxx.supabase.co`

### 5. SUPABASE_SERVICE_ROLE_KEY
**Source:** Supabase Dashboard
- Same location as above: **Settings** → **API**
- Scroll to **Project API keys**
- Copy the **`service_role`** key (NOT the `anon` key)
- This key starts with `eyJhbGc...`
- ⚠️ **CRITICAL:** Use `service_role`, not `anon` key

---

## Verification Checklist

After adding all variables:

- [ ] All 5 variables added to Production environment
- [ ] `NVIDIA_NIM_API_KEY` marked as secret (encrypted)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` marked as secret (encrypted)
- [ ] No `VITE_` prefix on any variable
- [ ] Values copied exactly (no extra spaces)
- [ ] Supabase service_role key used (not anon key)

---

## What About Frontend Variables?

The **frontend** (client bundle) needs these variables, which should **already be configured** in your Cloudflare Pages settings:

| Key Name | Value Source | For |
|----------|--------------|-----|
| `VITE_SUPABASE_URL` | Same as `SUPABASE_URL` | Frontend Supabase client |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key | Frontend Supabase client |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID | Frontend config |

**Note:** These are NOT needed for the chatbot backend, but your existing QuizHub Pro app needs them.

---

## Testing After Configuration

After adding all variables and redeploying:

```bash
# Test the chat endpoint
curl -X POST https://your-domain.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello, test message"}'

# Expected response: SSE stream or JSON response
# If you get errors, check Cloudflare logs
```

---

## Troubleshooting

### Error: "NVIDIA API error"
- Check `NVIDIA_NIM_API_KEY` is correct
- Verify key has not expired
- Check NVIDIA dashboard for quota/limits

### Error: "Supabase error" or "RLS policy violation"
- Verify `SUPABASE_SERVICE_ROLE_KEY` is the **service_role** key (not anon)
- Check Supabase migration was run
- Verify RLS policies are enabled

### Error: "Environment variable not found"
- Ensure variables are in **Production** environment (not Preview)
- Redeploy after adding variables
- Check for typos in key names (case-sensitive)

---

## Summary

**Total Required Variables:** 5  
**Secret Variables:** 2 (NVIDIA_NIM_API_KEY, SUPABASE_SERVICE_ROLE_KEY)  
**Optional Variables:** 1 (RATE_LIMIT_KV - KV namespace binding)

**Copy-Paste Ready:**

```
NVIDIA_NIM_API_KEY=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
NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_NIM_MODEL=deepseek-ai/deepseek-v4-pro
SUPABASE_URL=https://inyqkjsdcwifzhxayjmo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Replace `your-project-id` and `your-service-role-key-here` with your actual values from Supabase Dashboard.

---

**Ready to configure! 🚀**
