# 🎓 QuizHub Pro — Nền tảng Ôn luyện & Thi trực tuyến Thế hệ mới

![QuizHub Banner](https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=1200&h=400)

**QuizHub** là một nền tảng quản lý học tập và thi trắc nghiệm trực tuyến hiện đại, được thiết kế với trải nghiệm người dùng cao cấp, tốc độ vượt trội và quy trình làm việc thông minh cho cả Giáo viên và Học sinh.

---

## ✨ Tính năng Nổi bật

### 👨‍🎓 Đối với Học sinh
- **Bảng điều khiển thông minh:** Tìm kiếm môn học linh hoạt (Fuzzy Search) theo tên, mô tả hoặc mã học phần.
- **Top 100 Môn học:** Khám phá những môn học phổ biến nhất được cộng đồng quan tâm.
- **Chế độ Luyện tập (Practice Mode):**
    - Làm bài không giới hạn số lần.
    - Hỗ trợ phím tắt **Enter** để kiểm tra đáp án và chuyển câu nhanh chóng.
    - Hiển thị giải thích chi tiết ngay sau khi chọn.
    - Âm thanh phản hồi trực quan.
- **Phòng chờ Thi (Exam Lobby):** Kiểm tra thông tin, quy tắc và thời gian trước khi bắt đầu bài thi chính thức.

### 👩‍🏫 Đối với Giáo viên
- **Quản lý Toàn diện:** Tạo và quản lý Môn học, Ngân hàng câu hỏi và Đề thi một cách trực quan.
- **Import DOCX Thông minh:** 
    - Tự động parse câu hỏi từ file Word.
    - **Tự động tạo Đề thi** ngay sau khi import thành công.
- **Phân tích Kết quả:** Theo dõi bảng điểm, thống kê tỷ lệ đúng/sai và biểu đồ tăng trưởng của học sinh.

---

## 🎨 Giao diện & Trải nghiệm (UI/UX)
- **Premium Dark Mode:** Sử dụng hệ màu **OKLCH** hiện đại, mang lại chiều sâu và độ tương phản tuyệt vời.
- **Micro-animations:** Các hiệu ứng chuyển cảnh mượt mà, phản hồi tức thì khi tương tác.
- **Responsive Design:** Tối ưu hóa 100% cho các thiết bị di động, máy tính bảng và desktop.
- **100% Tiếng Việt:** Toàn bộ giao diện được địa phương hóa chuẩn xác, thân thiện.

---

## 🛠️ Công nghệ Sử dụng

| Công nghệ | Vai trò |
| :--- | :--- |
| **Vite + React 19** | Core framework mạnh mẽ, hiệu năng cao |
| **TanStack Router** | Quản lý routing an toàn và linh hoạt |
| **Supabase** | Backend-as-a-Service (Database, Auth, Realtime) |
| **Tailwind CSS v4** | Hệ thống styling hiện đại, tối ưu build |
| **Lucide Icons** | Bộ icon vector sắc nét |
| **TanStack Query** | Quản lý trạng thái server-side hiệu quả |

---

## 🚀 Hướng dẫn Triển khai (Deployment)

### 1. Biến môi trường (Environment Variables)
Đảm bảo bạn đã thiết lập các biến sau trên môi trường build (ví dụ Cloudflare Pages):
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
NODE_VERSION=20
```

### 2. Cài đặt & Build
```bash
# Cài đặt thư viện
npm install

# Chạy môi trường phát triển
npm run dev

# Đóng gói sản phẩm
npm run build
```

---

## 📄 Giấy phép
Dự án được phát triển bởi **QuizHub Team**. Mọi quyền được bảo lưu.

---
*Phát triển với ❤️ dành cho giáo dục Việt Nam.*
