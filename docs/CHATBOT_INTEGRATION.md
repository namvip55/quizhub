# AI Chatbot Integration — QuizHub Pro

Tài liệu này ghi lại toàn bộ quá trình xây dựng AI Chatbot tích hợp NVIDIA NIM vào QuizHub Pro,
bao gồm kiến trúc, các bước triển khai, và các vấn đề thường gặp.

---

## 📐 Kiến trúc tổng quan

```
Client (React)
  └── AIChatWidget.client.tsx        ← Floating UI widget
        ├── useChatSession           ← Quản lý session ID (Supabase)
        ├── useChatHistory           ← Fetch lịch sử tin nhắn (TanStack Query)
        └── useChatStream            ← Gửi message + parse SSE stream
              └── POST /api/chat     ← TanStack Start server handler
                    └── NVIDIA NIM API (DeepSeek v4-pro) — SSE stream
                          └── chat_messages (Supabase) ← Lưu tin nhắn
```

**Data flow khi gửi 1 tin nhắn:**
1. User nhập → `useChatStream.sendMessage()`
2. Optimistic update → thêm tin nhắn vào TanStack Query cache ngay lập tức
3. Lưu tin nhắn user vào Supabase (`chat_messages`)
4. Gọi `POST /api/chat` với SSE stream
5. Server gọi NVIDIA NIM → pipe SSE chunks về client
6. Client parse từng chunk → cập nhật cache real-time (chữ chạy dần dần)
7. Khi stream xong → lưu toàn bộ response của assistant vào Supabase

---

## 🛠️ Tech Stack

| Thành phần | Công nghệ |
|---|---|
| AI Model | NVIDIA NIM — `deepseek-ai/deepseek-v4-pro` |
| API Endpoint | TanStack Start `server.handlers` |
| Streaming | Server-Sent Events (SSE) |
| State / Cache | TanStack Query (optimistic updates) |
| Persistence | Supabase PostgreSQL |
| Auth | Supabase Auth (hỗ trợ cả anonymous user) |
| UI | React + Shadcn/ui |

---

## 📁 Cấu trúc file

```
src/
├── routes/
│   └── api.chat.ts                  ← Server handler (POST /api/chat)
├── types/
│   └── chat.types.ts                ← Type definitions
├── services/
│   └── chat/
│       └── chat.service.ts          ← Supabase CRUD operations
├── hooks/
│   └── chat/
│       ├── index.ts                 ← Re-exports
│       ├── useChatSession.ts        ← Tạo/lấy session ID
│       ├── useChatHistory.ts        ← Fetch message history
│       └── useChatStream.client.ts  ← Streaming logic
└── components/
    └── chat/
        ├── index.ts
        ├── AIChatWidget.client.tsx  ← Main widget UI
        ├── ChatMessage.tsx          ← Render 1 tin nhắn
        └── ChatInput.tsx            ← Input box

supabase/
└── migrations/
    └── 20260428000000_create_chat_tables.sql
```

---

## ⚙️ Cấu hình môi trường

Thêm vào file `.env`:

```env
NVIDIA_NIM_API_KEY="nvapi-..."
NVIDIA_NIM_BASE_URL="https://integrate.api.nvidia.com/v1"
NVIDIA_NIM_MODEL="deepseek-ai/deepseek-v4-pro"
```

> ⚠️ Lấy API key tại: https://build.nvidia.com → **Get API Key**
> Nếu key bị lộ (paste vào chat, commit lên git...), hãy regenerate ngay.

---

## 🗄️ Database Schema (Supabase)

### Bảng `chat_sessions`
```sql
CREATE TABLE chat_sessions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL = anonymous
  title      TEXT DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### Bảng `chat_messages`
```sql
CREATE TABLE chat_messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
```

### RLS Policies
- **Authenticated users**: chỉ xem/sửa/xóa session và message của chính họ.
- **Anonymous users**: session có `user_id = NULL`, ai biết `session_id` cũng đọc được.

Apply migration:
```bash
# Qua Supabase MCP (đã apply)
# Hoặc thủ công: paste nội dung file .sql vào Supabase Dashboard > SQL Editor
```

---

## 🔌 API Endpoint — `src/routes/api.chat.ts`

### Pattern quan trọng: TanStack Start v1.x

TanStack Start v1.x dùng `createFileRoute` + `server.handlers`, **KHÔNG phải** `createAPIFileRoute`:

```typescript
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/chat')({
  // @ts-ignore — server property works at runtime (TanStack Start v1.167)
  server: {
    handlers: {
      POST: async ({ request }) => {
        // ...xử lý request
        return new Response(...);
      },
    },
  },
});
```

### Request body (`ChatRequest`)
```typescript
interface ChatRequest {
  message: string;        // Required, max 4000 ký tự
  sessionId?: string;     // ID phiên chat
  userId?: string;        // User ID (undefined = anonymous)
  stream?: boolean;       // true = SSE stream, false = JSON response
  context?: {
    type: 'exam' | 'question' | 'general';
    questionContent?: string;  // Nội dung câu hỏi (đưa vào system prompt)
    examTopic?: string;
  };
}
```

### NVIDIA NIM call (DeepSeek v4-pro)

```typescript
const response = await fetch(`${baseUrl}/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model,
    messages,
    stream: true,
    max_tokens: 16384,
    temperature: 1,
    top_p: 0.95,
    chat_template_kwargs: { thinking: false }, // ← Quan trọng với DeepSeek!
  }),
});
```

> `chat_template_kwargs: { thinking: false }` tắt chế độ chain-of-thought (thinking) của DeepSeek,
> giúp response nhanh hơn và không có phần `<think>...</think>` trong output.

### SSE Response format

Server trả về SSE stream với format:

```
data: {"type":"chunk","content":"Xin"}
data: {"type":"chunk","content":" chào"}
data: {"type":"done"}
```

Khi lỗi:
```
data: {"type":"error","message":"NVIDIA API error: 401"}
```

---

## 🪝 Hook: `useChatStream`

File: `src/hooks/chat/useChatStream.client.ts`

**Luồng xử lý:**
1. Optimistic update: thêm user message vào TanStack Query cache với `temp-user-{timestamp}` ID
2. Lưu user message vào Supabase → replace temp ID bằng real ID
3. `fetch('/api/chat', { stream: true })`
4. Thêm empty assistant message vào cache với `temp-assistant-{timestamp}` ID
5. Parse SSE: mỗi `chunk` → cập nhật content của assistant message trong cache
6. Khi `done` → lưu assistant message vào Supabase → replace temp ID

**Abort stream:**
```typescript
const { abortStream } = useChatStream({ ... });
// User có thể dừng stream giữa chừng:
abortStream(); // AbortError → không báo lỗi, chỉ dừng stream
```

---

## 🧩 Component: `AIChatWidget.client.tsx`

Suffix `.client.tsx` bắt buộc vì component dùng browser APIs (`useEffect`, `useRef`, event listeners).
Trong `__root.tsx`, render có guard:

```tsx
// Chỉ render trên client, tránh SSR hydration mismatch
const [isClient, setIsClient] = useState(false);
useEffect(() => setIsClient(true), []);

// ...
{isClient && <AIChatWidget />}
```

**UI behavior:**
- Mobile: full-screen modal (slide in from bottom)
- Desktop: floating widget 400×600px (bottom-right), có minimize
- Đóng bằng `Escape` key
- Auto-scroll xuống cuối khi có tin nhắn mới

**Context-aware system prompt:**
```tsx
// Trong trang exam, truyền context để AI biết user đang làm bài gì:
<AIChatWidget
  context={{
    type: 'question',
    questionContent: 'Thủ đô của Việt Nam là gì?',
  }}
/>
```

---

## 🚀 Test nhanh

```bash
# Non-streaming
curl -X POST http://localhost:8097/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Xin chào","stream":false}'

# Streaming (SSE)
curl -N -X POST http://localhost:8097/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Xin chào","stream":true}'
```

---

## 🐛 Các vấn đề đã gặp và cách fix

### 1. `createAPIFileRoute` không tồn tại trong TanStack Start v1.x
**Lỗi:** `Cannot find module '@tanstack/react-start/api'`
**Fix:** Dùng `createFileRoute` từ `@tanstack/react-router` + `server.handlers` + `@ts-ignore`

### 2. Chat widget render trên server → hydration mismatch
**Fix:** Wrap `<AIChatWidget />` trong `isClient && ...` guard (useState + useEffect)

### 3. DeepSeek model trả về `<think>...</think>` trong response
**Fix:** Thêm `chat_template_kwargs: { thinking: false }` vào request body

### 4. SSE stream bị cắt đứt giữa chừng
**Nguyên nhân:** Buffer chưa split đúng dòng. Parse SSE cần buffer từng chunk:
```typescript
buffer += decoder.decode(value, { stream: true });
const lines = buffer.split('\n');
buffer = lines.pop() || ''; // Giữ lại dòng chưa hoàn chỉnh
```

### 5. Anonymous user không tạo được session (RLS block)
**Fix:** Thêm policy riêng cho `user_id IS NULL`:
```sql
CREATE POLICY "Anonymous users can create sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (user_id IS NULL);
```

---

## 📦 Models NVIDIA NIM khác có thể dùng

| Model | Đặc điểm |
|---|---|
| `deepseek-ai/deepseek-v4-pro` | Mạnh, reasoning tốt, đang dùng |
| `meta/llama-3.1-8b-instruct` | Nhanh, rẻ, phù hợp Q&A đơn giản |
| `nvidia/llama-3.1-nemotron-70b-instruct` | Cân bằng tốc độ và chất lượng |
| `mistralai/mistral-7b-instruct-v0.3` | Nhẹ, tiết kiệm token |

Đổi model chỉ cần thay `NVIDIA_NIM_MODEL` trong `.env`.

---

*Tài liệu này được tạo ngày 2026-04-28 sau khi tích hợp thành công chatbot vào QuizHub Pro.*
