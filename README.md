<div align="center">
  <img src="https://raw.githubusercontent.com/namvip55/quizhub/main/public/favicon.ico" alt="QuizHub Logo" width="100" height="100">

# 🎓 QuizHub Pro

### _The Pinnacle of Modern Online Examination Systems_

  <p align="center">
    <b>Secure by Default. Fast by Design. Powered by Pure Vibe Coding.</b>
  </p>

[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TanStack](https://img.shields.io/badge/TanStack-Router%20%26%20Query-FF4154?style=for-the-badge&logo=react-query)](https://tanstack.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind v4](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Vitest-Tested-6E9F18?style=for-the-badge&logo=vitest)](https://vitest.dev/)

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

## 🛡️ Kiến Trúc "Zero-Trust" Security (MỚI ĐƯỢC NÂNG CẤP)

Không giống như các nền tảng truyền thống phó mặc logic cho Frontend, QuizHub Pro áp dụng triết lý **"Server is the Single Source of Truth"**:

- 🔒 **No Direct Inserts/Updates:** Toàn bộ quyền ghi trực tiếp (DML) vào bảng điểm/phiên thi (`exam_attempts`) bị khóa chặt. Khách ẩn danh lẫn học sinh đăng nhập đều **bắt buộc** đi qua các cửa ngõ kiểm duyệt là hàm RPC.
- ⏱️ **Server-Side Timeout Enforcement:** Thời gian thi được backend kiểm soát khắt khe tới từng giây. Bất kỳ nỗ lực gian lận đồng hồ máy tính nào cũng sẽ bị từ chối; hệ thống sử dụng thuật toán Grace Period để bảo vệ quyền lợi học sinh khi nghẽn mạng nhưng không cho phép hack thời gian.
- 💾 **Debounced Auto-Save & Resilient Sessions:** Bạn lỡ tắt trình duyệt? Không sao cả. Backend lưu trữ mọi cú click chọn đáp án thông qua `save_attempt_progress` chạy ngầm mỗi 5 giây. Học sinh có thể quay lại sảnh (Lobby) và tiếp tục bài làm ngay tại nơi họ dừng lại một cách vô hình và mượt mà.
- 🛡️ **Session Fingerprinting:** Khách ẩn danh (Anon User) được định danh thông qua một session secret sinh ra tự động duy nhất trên Browser, ngăn chặn việc bypass bộ lọc giới hạn số lần thi (`max_attempts`).

---

## ✨ Trải Nghiệm "Wow" (The Feature Suite)

### 🌊 Dành cho Học Sinh (The Fluid Flow)

- **Seamless Resumption:** Hệ thống nhận diện bài thi dang dở siêu tốc, một click để "Tiếp tục bài thi đang làm".
- **Smart Dashboard:** Tìm kiếm môn học và bài thi tức thì với công nghệ Fuzzy Search.
- **Elite Practice Mode:** Hệ thống phím tắt (Hotkeys) chuyên nghiệp, âm thanh phản hồi haptic-like, và giải thích chi tiết đáp án ngay tức khắc.
- **Lobby Experience:** Phòng chờ chuyên nghiệp, quy tắc thi minh bạch, chuẩn bị tâm lý hoàn hảo trước giờ G.

### 🏛️ Dành cho Giáo Viên (The Power Suite)

- **AI-Ready Import:** Tự động phân tích và bóc tách câu hỏi từ file Word (DOCX) thô sơ để tạo đề thi hoàn chỉnh chỉ trong 1 cú click.
- **Deep Analytics:** Theo dõi hiệu suất học sinh, bảng điểm realtime và phân tích độ khó câu hỏi thông qua các biểu đồ trực quan.
- **Publish Control:** Quản lý vòng đời đề thi tinh gọn. Đề thi chưa `published` sẽ bị backend block hoàn toàn mọi truy cập từ bên ngoài.

---

## 🛠️ Stack Công Nghệ "Hardcore"

Chúng tôi chọn những vũ khí tối tân nhất để đảm bảo hệ thống có thể scale vô hạn:

| Layer        | Technology          | Tại sao chúng tôi chọn?                                                    |
| :----------- | :------------------ | :------------------------------------------------------------------------- |
| **Frontend** | React 19 + Vite     | Compiler siêu tốc, kiến trúc Server Components & Actions đón đầu xu hướng. |
| **Routing**  | TanStack Router     | Type-safe routing 100%, tạm biệt vĩnh viễn lỗi undefined params.           |
| **State**    | TanStack Query v5   | Caching thông minh, Auto-retry, và đồng bộ dữ liệu server hoàn hảo.        |
| **Backend**  | Supabase (Postgres) | PL/pgSQL RPCs, Row Level Security (RLS) và Database Triggers mạnh mẽ.      |
| **Styling**  | Tailwind CSS v4     | Hệ màu OKLCH, Dark Mode chuẩn Premium, không cần config lằng nhằng.        |
| **Quality**  | TypeScript + Zod    | Bảo vệ End-to-End Type Safety. Lỗi bị chặn ngay từ lúc gõ code.            |

---

## 💎 Tiêu Chuẩn 10/10 (Production Excellence)

QuizHub Pro không phải là một "toy project". Nó được mài giũa qua các tiêu chuẩn khắt khe:

1. **Component Modularity:** UI được xây dựng từ các Atomic Components (Shadcn UI).
2. **Strict Typing:** `tsc --noEmit` pass 100%. Không có bất kỳ ngoại lệ `any` nào trong core logic.
3. **Database as Code:** Mọi logic phân quyền, giới hạn retry, timeout đều nằm gọn trong các file SQL Migrations có khả năng tái lập (reproducible).

---

## 🚀 Khởi Chạy Thần Tốc

Chỉ mất chưa tới 2 phút để đưa QuizHub Pro lên local của bạn:

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

# 4. Compile Check & Formatting (Vibe Check)
npm run build
npm run format
```

---

## 📄 Vision & License

Được thiết kế và kiến trúc bởi **QuizHub Team**.
Tầm nhìn của chúng tôi không chỉ dừng lại ở việc số hóa đề thi, mà là kiến tạo một chuẩn mực trải nghiệm phần mềm giáo dục ngang tầm với các ứng dụng công nghệ hàng đầu thế giới.

---

<div align="center">
  <i>Built with ❤️, relentless passion, and pure <b>Vibe Coding</b> energy.</i>
</div>
