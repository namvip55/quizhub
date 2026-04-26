export function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row">
        <p>© {new Date().getFullYear()} QuizHub. Đã đăng ký bản quyền.</p>
        <p>Xây dựng với React 19 · TanStack · Tailwind</p>
      </div>
    </footer>
  );
}
