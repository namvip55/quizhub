# AI Chatbot Deployment Guide
**Last Updated:** 2026-04-28  
**Target Platform:** Cloudflare Pages + Supabase

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Database Setup (Supabase)](#database-setup-supabase)
3. [Local Development](#local-development)
4. [Production Deployment](#production-deployment)
5. [Environment Variables](#environment-variables)
6. [Rate Limiting Setup](#rate-limiting-setup)
7. [Verification & Testing](#verification--testing)
8. [Troubleshooting](#troubleshooting)
9. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

### Required Accounts
- ✅ Cloudflare account (Pages + Workers)
- ✅ Supabase account (database)
- ✅ NVIDIA NIM API account (AI model access)

### Required Tools
```bash
# Node.js 22+ (check version)
node --version  # Should be v22.x.x

# npm (comes with Node.js)
npm --version

# Wrangler CLI (Cloudflare)
npm install -g wrangler

# Supabase CLI (optional, for migrations)
npm install -g supabase
```

---

## Database Setup (Supabase)

### Step 1: Run Migration

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `supabase/migrations/20260428000000_create_chat_tables.sql`
5. Paste into the editor
6. Click **Run** (bottom-right)
7. Verify success message

**Option B: Using Supabase CLI**

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push migration
supabase db push
```

### Step 2: Verify Tables Created

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

### Step 3: Verify RLS Policies

```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('chat_sessions', 'chat_messages');
```

Should show 12 policies (6 per table).

### Step 4: Test Permissions

```sql
-- Test as authenticated user
SET ROLE authenticated;
SELECT * FROM chat_sessions LIMIT 1;

-- Test as anonymous user
SET ROLE anon;
SELECT * FROM chat_sessions WHERE user_id IS NULL LIMIT 1;

-- Reset role
RESET ROLE;
```

---

## Local Development

### Step 1: Install Dependencies

```bash
cd quizhub-pro
npm install
```

### Step 2: Configure Environment Variables

Create `.dev.vars` file (already exists, update values):

```bash
# NVIDIA NIM API Configuration
NVIDIA_NIM_API_KEY=nvapi-YOUR_KEY_HERE
NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_NIM_MODEL=deepseek-ai/deepseek-v4-pro

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Get Supabase Service Role Key:**
1. Go to Supabase Dashboard
2. Settings → API
3. Copy "service_role" key (NOT anon key)

### Step 3: Start Dev Server

```bash
npm run dev
```

Server starts at: `http://localhost:5173`

### Step 4: Test Chat Widget

1. Open browser to `http://localhost:5173`
2. Click floating chat button (bottom-right)
3. Send a test message: "Hello, can you help me?"
4. Verify streaming response appears
5. Check Supabase dashboard → Table Editor → `chat_messages`
6. Should see your message saved

---

## Production Deployment

### Step 1: Update CORS Configuration

**CRITICAL:** Update `functions/api/chat.ts` before deploying:

```typescript
// Find this line (around line 180):
'Access-Control-Allow-Origin': '*',

// Replace with your production domain:
'Access-Control-Allow-Origin': 'https://quizhub.yourdomain.com',
```

### Step 2: Build for Production

```bash
npm run build
```

Verify build output in `dist/client/`.

### Step 3: Deploy to Cloudflare Pages

**Option A: Using Wrangler CLI**

```bash
npx wrangler pages deploy dist/client
```

**Option B: Using Cloudflare Dashboard**

1. Go to Cloudflare Dashboard
2. Pages → Create a project
3. Connect to Git repository (GitHub/GitLab)
4. Build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist/client`
   - **Root directory:** `/`
5. Click **Save and Deploy**

### Step 4: Configure Environment Variables

In Cloudflare Dashboard:

1. Go to **Pages** → Your project → **Settings** → **Environment variables**
2. Add the following variables:

**Production Environment:**

| Variable Name | Value | Notes |
|---------------|-------|-------|
| `NVIDIA_NIM_API_KEY` | `nvapi-YOUR_KEY` | From NVIDIA dashboard |
| `NVIDIA_NIM_BASE_URL` | `https://integrate.api.nvidia.com/v1` | NVIDIA API endpoint |
| `NVIDIA_NIM_MODEL` | `deepseek-ai/deepseek-v4-pro` | Model identifier |
| `SUPABASE_URL` | `https://xxx.supabase.co` | From Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` | From Supabase API settings |
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | Same as SUPABASE_URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGc...` | Anon key (NOT service role) |

**Preview Environment (Optional):**
- Same variables as production
- Can use separate Supabase project for testing

### Step 5: Redeploy

After adding environment variables:
```bash
npx wrangler pages deploy dist/client
```

Or trigger redeploy in Cloudflare Dashboard.

---

## Environment Variables

### Complete Reference

#### Frontend Variables (VITE_*)
These are embedded in the client bundle:

```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...  # Anon key
VITE_SUPABASE_PROJECT_ID=xxx
```

#### Backend Variables (Cloudflare Pages Functions)
These are server-side only:

```bash
NVIDIA_NIM_API_KEY=nvapi-xxx              # NEVER expose to client
NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_NIM_MODEL=deepseek-ai/deepseek-v4-pro
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...      # NEVER expose to client
```

### Security Notes
- ✅ `VITE_*` variables are public (embedded in bundle)
- ❌ Never put API keys in `VITE_*` variables
- ✅ Backend variables are server-side only
- ✅ Use service role key for backend, anon key for frontend

---

## Rate Limiting Setup

### Step 1: Create KV Namespace

```bash
# Create production namespace
npx wrangler kv:namespace create "RATE_LIMIT_KV"

# Output example:
# { binding = "RATE_LIMIT_KV", id = "abc123..." }

# Create preview namespace (for testing)
npx wrangler kv:namespace create "RATE_LIMIT_KV" --preview
```

### Step 2: Update wrangler.toml

Uncomment and update the KV namespace section:

```toml
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "abc123..."              # From step 1 output
preview_id = "xyz789..."      # From preview namespace
```

### Step 3: Bind to Pages Project

In Cloudflare Dashboard:
1. Pages → Your project → **Settings** → **Functions**
2. Scroll to **KV namespace bindings**
3. Click **Add binding**
4. Variable name: `RATE_LIMIT_KV`
5. KV namespace: Select the one you created
6. Click **Save**

### Step 4: Redeploy

```bash
npx wrangler pages deploy dist/client
```

### Step 5: Verify Rate Limiting

Test with curl:
```bash
# Send 11 requests quickly (rate limit is 10/min)
for i in {1..11}; do
  curl -X POST https://your-domain.com/api/chat \
    -H "Content-Type: application/json" \
    -d '{"message":"Test '$i'"}'
  echo ""
done

# 11th request should return HTTP 429
```

---

## Verification & Testing

### 1. Test Chat Widget

**Checklist:**
- [ ] Floating button appears (bottom-right)
- [ ] Click opens widget
- [ ] Send message → User message appears instantly
- [ ] AI response streams character-by-character
- [ ] Messages persist on page reload
- [ ] Mobile: Full-screen modal
- [ ] Desktop: Floating widget with minimize

### 2. Test Authentication

**Anonymous User:**
```bash
# Open incognito window
# Send message
# Check localStorage: quizhub_anon_chat_session
# Reload page → Session should restore
```

**Authenticated User:**
```bash
# Login as teacher/student
# Send message
# Check Supabase: chat_sessions.user_id should be set
# Login on different device → History should sync
```

### 3. Test Rate Limiting

```bash
# Send 10 requests → Should succeed
# Send 11th request → Should return 429
# Wait 60 seconds → Should work again
```

### 4. Test Context-Aware Chat

```typescript
// In exam page, pass context:
<AIChatWidget context={{
  type: "question",
  questionContent: "What is photosynthesis?",
  examTopic: "Biology"
}} />

// Send message: "Explain this question"
// AI should reference the question in response
```

### 5. Database Verification

```sql
-- Check sessions created
SELECT COUNT(*) FROM chat_sessions;

-- Check messages saved
SELECT COUNT(*) FROM chat_messages;

-- Check RLS working (as authenticated user)
SELECT * FROM chat_sessions WHERE user_id = 'your-user-id';

-- Check anonymous sessions
SELECT * FROM chat_sessions WHERE user_id IS NULL;
```

---

## Troubleshooting

### Issue: Chat widget not appearing

**Symptoms:** No floating button visible

**Solutions:**
1. Check browser console for errors
2. Verify `<AIChatWidget />` in `__root.tsx`
3. Clear browser cache and hard reload
4. Check z-index conflicts with other elements

### Issue: "Rate limit exceeded" immediately

**Symptoms:** First request returns 429

**Solutions:**
1. Check KV namespace is bound correctly
2. Verify `RATE_LIMIT_KV` binding name matches code
3. Clear KV namespace: `npx wrangler kv:key delete --binding=RATE_LIMIT_KV "rate_limit:YOUR_IP"`

### Issue: Messages not saving to database

**Symptoms:** Messages appear in UI but not in Supabase

**Solutions:**
1. Check `SUPABASE_SERVICE_ROLE_KEY` is set correctly
2. Verify RLS policies are enabled
3. Check Supabase logs for errors
4. Test with SQL: `INSERT INTO chat_messages (...) VALUES (...)`

### Issue: "CORS error" in browser console

**Symptoms:** `Access-Control-Allow-Origin` error

**Solutions:**
1. Update CORS in `functions/api/chat.ts`
2. Redeploy after changing CORS
3. Clear browser cache
4. Verify domain matches exactly (no trailing slash)

### Issue: Streaming not working

**Symptoms:** Full response appears at once, not character-by-character

**Solutions:**
1. Check `stream: true` in request
2. Verify SSE parsing in `useChatStream.ts`
3. Check browser supports EventSource
4. Test with curl: `curl -N https://your-domain.com/api/chat ...`

### Issue: "NVIDIA API error"

**Symptoms:** Error message from NVIDIA API

**Solutions:**
1. Verify `NVIDIA_NIM_API_KEY` is correct
2. Check API key has not expired
3. Verify model name is correct: `deepseek-ai/deepseek-v4-pro`
4. Check NVIDIA dashboard for quota/limits
5. Test API directly: `curl https://integrate.api.nvidia.com/v1/chat/completions ...`

---

## Monitoring & Maintenance

### 1. Monitor API Usage

**NVIDIA Dashboard:**
- Track API calls per day
- Monitor token usage
- Set up billing alerts

**Cloudflare Analytics:**
- Pages → Your project → **Analytics**
- Monitor request count
- Check error rates
- View geographic distribution

### 2. Monitor Database Usage

**Supabase Dashboard:**
- Database → **Usage**
- Monitor storage size
- Check connection count
- Review slow queries

### 3. Set Up Alerts

**Cloudflare:**
- Workers & Pages → **Notifications**
- Alert on error rate > 5%
- Alert on response time > 2s

**Supabase:**
- Project Settings → **Alerts**
- Alert on database size > 80%
- Alert on connection pool exhaustion

### 4. Regular Maintenance

**Weekly:**
- [ ] Check error logs in Cloudflare
- [ ] Review Supabase slow query log
- [ ] Monitor NVIDIA API quota

**Monthly:**
- [ ] Review and clean up old anonymous sessions
- [ ] Analyze chat usage patterns
- [ ] Update dependencies: `npm update`
- [ ] Run security audit: `npm audit`

**Quarterly:**
- [ ] Review and optimize database indices
- [ ] Analyze and optimize API costs
- [ ] Update NVIDIA model if newer version available

### 5. Cleanup Old Data (Optional)

```sql
-- Delete anonymous sessions older than 30 days
DELETE FROM chat_sessions 
WHERE user_id IS NULL 
AND created_at < NOW() - INTERVAL '30 days';

-- Vacuum to reclaim space
VACUUM ANALYZE chat_sessions;
VACUUM ANALYZE chat_messages;
```

---

## Performance Optimization

### 1. Database Indices

Already created in migration:
- ✅ `idx_chat_sessions_user_id`
- ✅ `idx_chat_messages_session_id`
- ✅ `idx_chat_messages_session_created` (composite)

### 2. Cloudflare Caching

Add to `wrangler.toml`:
```toml
[env.production]
# Cache static assets
[[env.production.routes]]
pattern = "*.js"
cache_ttl = 31536000  # 1 year

[[env.production.routes]]
pattern = "*.css"
cache_ttl = 31536000  # 1 year
```

### 3. Bundle Size Optimization

```bash
# Analyze bundle size
npm run build -- --mode production

# Check output size
du -sh dist/client/assets/*

# Target: < 500KB for main bundle
```

---

## Cost Estimation

### NVIDIA NIM API
- **Model:** DeepSeek-V4-Pro
- **Pricing:** ~$0.14 per 1M input tokens, ~$0.28 per 1M output tokens
- **Estimate:** 1000 messages/day = ~$5-10/month

### Cloudflare Pages
- **Free tier:** 500 builds/month, unlimited requests
- **Paid:** $20/month for advanced features
- **Estimate:** Free tier sufficient for most use cases

### Supabase
- **Free tier:** 500MB database, 2GB bandwidth
- **Paid:** $25/month for 8GB database
- **Estimate:** Free tier for < 10K messages/month

**Total Estimated Cost:** $5-35/month depending on usage

---

## Security Checklist

Before going live:

- [ ] Update CORS to production domain
- [ ] Verify API keys are server-side only
- [ ] Run `npm audit fix`
- [ ] Test RLS policies
- [ ] Enable rate limiting (KV namespace)
- [ ] Set up monitoring alerts
- [ ] Review and remove console.log statements
- [ ] Test on multiple devices/browsers
- [ ] Verify HTTPS enabled
- [ ] Test error handling (disconnect internet, send message)

---

## Support & Resources

### Documentation
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Supabase Docs](https://supabase.com/docs)
- [NVIDIA NIM Docs](https://docs.nvidia.com/nim/)
- [TanStack Query Docs](https://tanstack.com/query/latest)

### Community
- [Cloudflare Discord](https://discord.gg/cloudflaredev)
- [Supabase Discord](https://discord.supabase.com)

---

## Deployment Checklist

Final checklist before production:

- [ ] Database migration applied
- [ ] RLS policies verified
- [ ] Environment variables set in Cloudflare
- [ ] CORS updated to production domain
- [ ] Rate limiting configured (KV namespace)
- [ ] Build successful (`npm run build`)
- [ ] Deployed to Cloudflare Pages
- [ ] Chat widget tested (anonymous + authenticated)
- [ ] Mobile responsive verified
- [ ] Error handling tested
- [ ] Monitoring alerts configured
- [ ] Security audit passed
- [ ] Documentation updated

---

**Deployment Complete! 🎉**

Your AI Chatbot is now live and ready for production use.
