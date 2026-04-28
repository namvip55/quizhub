# AI Chatbot - Quick Reference Card

**Last Updated:** 2026-04-28  
**Version:** 1.0.0

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:5173
# Click floating chat button (bottom-right)
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `functions/api/chat.ts` | Backend API endpoint (SSE streaming) |
| `src/components/chat/AIChatWidget.tsx` | Main chat widget component |
| `src/hooks/chat/useChatStream.ts` | SSE streaming hook |
| `src/hooks/chat/useChatSession.ts` | Session management |
| `src/services/chat/chat.service.ts` | Supabase CRUD operations |
| `supabase/migrations/20260428000000_create_chat_tables.sql` | Database schema |

---

## 🔧 Environment Variables

### Local Development (`.dev.vars`)
```bash
NVIDIA_NIM_API_KEY=nvapi-YOUR_KEY
NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_NIM_MODEL=deepseek-ai/deepseek-v4-pro
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Production (Cloudflare Dashboard)
Same as above, plus:
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

---

## 🎨 Usage Examples

### Basic Usage (Auto-create session)
```tsx
import { AIChatWidget } from "@/components/chat";

function App() {
  return (
    <div>
      <YourContent />
      <AIChatWidget />
    </div>
  );
}
```

### With Context (Exam page)
```tsx
<AIChatWidget 
  context={{
    type: "question",
    questionContent: "What is photosynthesis?",
    examTopic: "Biology"
  }} 
/>
```

### Custom Hooks Usage
```tsx
import { useChatSession, useChatHistory, useChatStream } from "@/hooks/chat";

function CustomChat() {
  const { sessionId } = useChatSession({ autoCreate: true });
  const { data: messages } = useChatHistory({ sessionId: sessionId! });
  const { sendMessage, isStreaming } = useChatStream({ sessionId: sessionId! });

  return (
    <div>
      {messages?.map(msg => <div key={msg.id}>{msg.content}</div>)}
      <button onClick={() => sendMessage("Hello!")}>Send</button>
    </div>
  );
}
```

---

## 🗄️ Database Schema

### Tables
```sql
chat_sessions (id, user_id, title, created_at, updated_at)
chat_messages (id, session_id, role, content, created_at, user_id)
```

### Query Examples
```sql
-- Get user's sessions
SELECT * FROM chat_sessions WHERE user_id = 'user-uuid';

-- Get session messages
SELECT * FROM chat_messages WHERE session_id = 'session-uuid' ORDER BY created_at;

-- Clean up old anonymous sessions
DELETE FROM chat_sessions WHERE user_id IS NULL AND created_at < NOW() - INTERVAL '30 days';
```

---

## 🔒 Security

### RLS Policies
- ✅ Users can only access their own sessions
- ✅ Anonymous sessions are public (by session_id)
- ✅ 12 policies total (6 per table)

### Rate Limiting
- 10 requests per minute per user/IP
- Configurable via KV namespace
- Returns HTTP 429 when exceeded

### Input Validation
- Message max length: 4,000 chars (API), 50,000 chars (DB)
- Role enum: 'user' | 'assistant' | 'system'
- Title max length: 200 chars

---

## 🐛 Troubleshooting

### Widget not appearing
```bash
# Check browser console for errors
# Verify import in __root.tsx
# Clear cache and hard reload (Ctrl+Shift+R)
```

### Messages not saving
```bash
# Check Supabase service role key
# Verify RLS policies enabled
# Check Supabase logs for errors
```

### CORS errors
```typescript
// Update functions/api/chat.ts line ~180
'Access-Control-Allow-Origin': 'https://your-domain.com',
```

### Rate limit issues
```bash
# Clear KV namespace
npx wrangler kv:key delete --binding=RATE_LIMIT_KV "rate_limit:YOUR_IP"
```

---

## 📊 Monitoring

### Cloudflare Analytics
```
Pages > Your Project > Analytics
- Request count to /api/chat
- Error rates
- Response times
```

### Supabase Monitoring
```
Database > Usage
- Storage size
- Connection count
- Slow queries
```

### NVIDIA Dashboard
```
- API usage tracking
- Token consumption
- Billing alerts
```

---

## 🚢 Deployment

### Build
```bash
npm run build
```

### Deploy
```bash
npx wrangler pages deploy dist/client
```

### Verify
```bash
# Test endpoint
curl -X POST https://your-domain.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'
```

---

## 📝 Common Tasks

### Add new message type
```typescript
// 1. Update chat.types.ts
export type ChatRole = 'user' | 'assistant' | 'system' | 'error';

// 2. Update database constraint
ALTER TABLE chat_messages DROP CONSTRAINT chat_messages_role_check;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_role_check 
  CHECK (role IN ('user', 'assistant', 'system', 'error'));

// 3. Update ChatMessage.tsx styling
```

### Change rate limit
```typescript
// functions/api/chat.ts line ~90
const maxRequests = 20; // Change from 10 to 20
```

### Update AI model
```bash
# Update .dev.vars and Cloudflare env vars
NVIDIA_NIM_MODEL=new-model-name
```

---

## 🔗 Useful Links

- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Security Audit](./SECURITY_AUDIT.md)
- [Complete Summary](./AI_CHATBOT_SUMMARY.md)
- [Cloudflare Docs](https://developers.cloudflare.com/pages/)
- [Supabase Docs](https://supabase.com/docs)
- [NVIDIA NIM Docs](https://docs.nvidia.com/nim/)

---

## 💡 Tips & Best Practices

### Performance
- Use optimistic updates for instant feedback
- Cache messages with TanStack Query (30s stale time)
- Lazy load message history (pagination)

### UX
- Auto-scroll to bottom on new messages
- Show typing indicator during streaming
- Disable input during streaming
- Clear error messages

### Security
- Never expose API keys in frontend
- Always validate input on backend
- Use RLS for data access control
- Implement rate limiting

### Maintenance
- Clean up old anonymous sessions monthly
- Monitor API usage and costs
- Update dependencies regularly
- Review security audit quarterly

---

## 📞 Support

### Issues
- Check [Troubleshooting](#-troubleshooting) section
- Review [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- Check Cloudflare/Supabase logs

### Documentation
- [CLAUDE.md](./CLAUDE.md) - Project overview
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Step-by-step deployment
- [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) - Security review
- [AI_CHATBOT_SUMMARY.md](./AI_CHATBOT_SUMMARY.md) - Complete summary

---

**Quick Reference Card v1.0.0**  
**Last Updated:** 2026-04-28
