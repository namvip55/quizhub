<div align="center">
  <img src="https://raw.githubusercontent.com/namvip55/quizhub/main/public/favicon.png" alt="QuizHub Logo" width="100" height="100">

# 🎓 QuizHub Pro

### _The Pinnacle of Modern Online Examination Systems_

  <p align="center">
    <b>Secure by Default. Fast by Design. Powered by Pure AI-Native Vibe Coding.</b>
  </p>

[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TanStack](https://img.shields.io/badge/TanStack-Router%20%26%20Query-FF4154?style=for-the-badge&logo=react-query)](https://tanstack.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Edge-F38020?style=for-the-badge&logo=cloudflare)](https://cloudflare.com/)
[![Tailwind v4](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

</div>

---

**QuizHub Pro** không đơn thuần chỉ là một ứng dụng thi trắc nghiệm trực tuyến; đó là một **tuyên ngôn công nghệ** về cách xây dựng phần mềm thế hệ mới. Bằng việc kết hợp kiến trúc Zero-Trust Security mạnh mẽ, khả năng phục hồi dữ liệu thời gian thực và một giao diện người dùng (UI) tuyệt mỹ, chúng tôi định nghĩa lại tiêu chuẩn của EdTech.

---

## ⚡ The Vibe Coding Philosophy

Dự án này được sinh ra và nuôi dưỡng từ triết lý **"High Fidelity, Low Friction"**:

- **Surgical Precision:** Không có một dòng code thừa. Mọi thay đổi đều nhắm đúng trọng tâm với độ chính xác tuyệt đối.
- **Architectural Integrity:** Tách biệt hoàn toàn giữa Presentation Layer (UI/UX), Business Logic (Custom Hooks & RPCs) và Data Layer (PostgreSQL).
- **Vibe-Driven Experience:** Chúng tôi tin rằng phần mềm tốt phải mang lại "cảm giác" tốt. Từ micro-animations mượt mà đến các chuyển động skeleton loader, mọi thứ đều được tính toán để tạo ra một "vibe" cao cấp.

---

## 🤖 The AI-Native Foundry

QuizHub Pro là thành quả của sự cộng tác đỉnh cao giữa con người và hệ sinh thái trí tuệ nhân tạo:

- **AI Co-Pilots:** Sự kết hợp sức mạnh từ **Gemini 1.5 Pro** (logic hệ thống), **ChatGPT-4o** (sáng tạo UI) và **DeepSeek** (tối ưu hóa thuật toán).
- **The Forge (IDE):** Được rèn giũa trong **Antigravity IDE** và **Cursor**, tận dụng tối đa khả năng **Codex** để tạo ra mã nguồn sạch và hiệu quả.
- **Workflow:** Mọi dòng code đều được AI review và tối ưu hóa trước khi commit, đảm bảo chất lượng tiệm cận mức hoàn hảo.

---

## 🛡️ Kiến Trúc "Zero-Trust" Security

Không giống như các nền tảng truyền thống phó mặc logic cho Frontend, QuizHub Pro áp dụng triết lý **"Server is the Single Source of Truth"**:

- 🔒 **No Direct Inserts/Updates:** Toàn bộ quyền ghi trực tiếp vào bảng điểm/phiên thi bị khóa chặt. Mọi thao tác đều đi qua các hàm RPC kiểm duyệt trên PostgreSQL.
- ⏱️ **Server-Side Timeout Enforcement:** Thời gian thi được backend kiểm soát khắt khe, ngăn chặn mọi nỗ lực gian lận đồng hồ máy tính.
- 💾 **Debounced Auto-Save:** Hệ thống lưu trữ tiến độ thi tự động mỗi 5 giây, cho phép phục hồi phiên làm bài ngay lập tức nếu có sự cố.
- 🛡️ **Session Fingerprinting:** Định danh khách ẩn danh thông qua session secret duy nhất, ngăn chặn bypass giới hạn lượt thi.

---

## ✨ Trải Nghiệm "Wow" (The Feature Suite)

### 🌊 Dành cho Học Sinh
- **Seamless Resumption:** Tiếp tục bài thi dang dở chỉ với một cú click.
- **Smart Dashboard:** Tìm kiếm môn học tức thì với công nghệ Fuzzy Search.
- **Elite Practice Mode:** Hệ thống phím tắt chuyên nghiệp và giải thích đáp án realtime.

### 🏛️ Dành cho Giáo Viên
- **AI-Ready Import:** Tự động bóc tách câu hỏi từ file Word (DOCX) thô sơ chỉ trong vài giây.
- **Deep Analytics:** Theo dõi hiệu suất học sinh qua biểu đồ trực quan và bảng điểm realtime.
- **Publish Control:** Quản lý vòng đời đề thi tinh gọn và bảo mật.

---

## 🛠️ Stack Công Nghệ "Hardcore"

| Layer             | Technology                 | Vai trò cốt yếu                                                    |
| :---------------- | :------------------------- | :----------------------------------------------------------------- |
| **Frontend**      | React 19 + TanStack Start  | Framework full-stack hiện đại, hỗ trợ SSR và Type-safe tuyệt đối.  |
| **State & Routing** | TanStack Query & Router    | Caching thông minh, đồng bộ dữ liệu server và quản lý luồng đi.    |
| **Backend**       | Supabase (Postgres)        | Real-time Database, RLS, Triggers và Edge Functions mạnh mẽ.       |
| **Infrastructure**| Cloudflare Pages/Workers   | Triển khai tại biên (Edge), tốc độ phản hồi cực thấp toàn cầu.     |
| **Styling**       | Tailwind CSS v4 + Radix UI | Hệ màu OKLCH, Dark Mode Premium và các Atomic Components.          |
| **AI ecosystem**  | Antigravity, Gemini, DeepSeek | "Bàn tay vô hình" hỗ trợ phát triển và tối ưu hóa mã nguồn.       |
| **Quality**       | Vitest + Zod + ESLint      | Đảm bảo chất lượng qua unit test và xác thực dữ liệu chặt chẽ.     |

---

## 🚀 Khởi Chạy Thần Tốc

```bash
# 1. Clone & Install
git clone https://github.com/namvip55/quizhub.git
cd quizhub
npm install

# 2. Config Environment (.env)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key

# 3. Development
npm run dev

# 4. Build & Format
npm run build
npm run format
```

---

## 📄 Vision & License

Được thiết kế và kiến trúc bởi **QuizHub Team**.
Tầm nhìn của chúng tôi là kiến tạo một chuẩn mực trải nghiệm phần mềm giáo dục ngang tầm với các ứng dụng công nghệ hàng đầu thế giới.

---

<div align="center">
  <i>Built with ❤️, AI Intelligence, and pure <b>Vibe Coding</b> energy.</i>
</div>
