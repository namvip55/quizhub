# ✅ Configuration Updated - inyq Project

**Date:** 2026-04-28T09:34:42Z  
**Project URL:** https://inyqkjsdcwifzhxayjmo.supabase.co  
**Project ID:** inyqkjsdcwifzhxayjmo

---

## 📝 Files Updated

I've updated the following files with your inyq project URL:

1. ✅ `.dev.vars` - Local development environment
2. ✅ `.env.example` - Example environment file
3. ✅ `CLOUDFLARE_ENV_VARS.md` - Cloudflare configuration guide

---

## 🔑 Next Steps

### 1. Get Your Supabase Keys

Go to: https://supabase.com/dashboard/project/inyqkjsdcwifzhxayjmo/settings/api

**Copy these values:**

**For `.dev.vars` (local development):**
```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Copy "service_role" key (secret)
```

**For Cloudflare Dashboard (production):**
```bash
# Backend (Pages Function):
SUPABASE_URL=https://inyqkjsdcwifzhxayjmo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # service_role key

# Frontend (if not already set):
VITE_SUPABASE_URL=https://inyqkjsdcwifzhxayjmo.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...  # anon key (public)
VITE_SUPABASE_PROJECT_ID=inyqkjsdcwifzhxayjmo
```

---

### 2. Update `.dev.vars`

Open `.dev.vars` and replace `your-service-role-key-here` with your actual service_role key:

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Paste your service_role key here
```

---

### 3. Run Database Migration

**Option A: Supabase Dashboard (Recommended)**
1. Go to: https://supabase.com/dashboard/project/inyqkjsdcwifzhxayjmo/editor
2. Click **SQL Editor**
3. Click **New Query**
4. Copy contents of `supabase/migrations/20260428000000_create_chat_tables.sql`
5. Paste and click **Run**

**Option B: Supabase CLI**
```bash
supabase link --project-ref inyqkjsdcwifzhxayjmo
supabase db push
```

---

### 4. Verify Tables Created

Run this query in SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('chat_sessions', 'chat_messages');
```

Expected output:
```
chat_sessions
chat_messages
```

---

### 5. Verify RLS Policies

```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('chat_sessions', 'chat_messages');
```

Should show 12 policies (6 per table).

---

### 6. Test Locally

```bash
npm run dev
# Open http://localhost:5173
# Click chat button (bottom-right)
# Send a test message
# Check Supabase dashboard → Table Editor → chat_messages
```

---

### 7. Configure Cloudflare Dashboard

**Go to:** Cloudflare Dashboard → Pages → Your Project → Settings → Environment variables

**Add these variables to Production:**

| Variable | Value | Secret? |
|----------|-------|---------|
| `NVIDIA_NIM_API_KEY` | `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` | ✅ Yes |
| `NVIDIA_NIM_BASE_URL` | `https://integrate.api.nvidia.com/v1` | ❌ No |
| `NVIDIA_NIM_MODEL` | `deepseek-ai/deepseek-v4-pro` | ❌ No |
| `SUPABASE_URL` | `https://inyqkjsdcwifzhxayjmo.supabase.co` | ❌ No |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` (your service_role key) | ✅ Yes |

**Frontend variables (if not already set):**

| Variable | Value | Secret? |
|----------|-------|---------|
| `VITE_SUPABASE_URL` | `https://inyqkjsdcwifzhxayjmo.supabase.co` | ❌ No |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGc...` (your anon key) | ❌ No |
| `VITE_SUPABASE_PROJECT_ID` | `inyqkjsdcwifzhxayjmo` | ❌ No |

---

### 8. Deploy to Production

```bash
npm run build
npx wrangler pages deploy dist/client
```

---

### 9. Test Production

```bash
# Test chat endpoint
curl -X POST https://your-domain.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello from production"}'
```

---

## ✅ Checklist

- [ ] Get service_role key from Supabase dashboard
- [ ] Update `.dev.vars` with service_role key
- [ ] Run migration on inyq project
- [ ] Verify tables created (chat_sessions, chat_messages)
- [ ] Verify RLS policies (12 policies)
- [ ] Test locally (send message, check database)
- [ ] Update Cloudflare Dashboard environment variables
- [ ] Deploy to production
- [ ] Test production (send message, check database)

---

## 🔗 Quick Links

- **Supabase Dashboard:** https://supabase.com/dashboard/project/inyqkjsdcwifzhxayjmo
- **API Settings:** https://supabase.com/dashboard/project/inyqkjsdcwifzhxayjmo/settings/api
- **SQL Editor:** https://supabase.com/dashboard/project/inyqkjsdcwifzhxayjmo/editor
- **Table Editor:** https://supabase.com/dashboard/project/inyqkjsdcwifzhxayjmo/editor

---

**Configuration Updated Successfully! ✅**

Your project is now configured to use the inyq Supabase project. Follow the steps above to complete the setup.
