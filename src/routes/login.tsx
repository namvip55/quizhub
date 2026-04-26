import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GraduationCap, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

const searchSchema = z.object({
  redirect: z.string().optional().catch("/dashboard"),
});

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Đăng nhập — QuizHub" },
      { name: "description", content: "Đăng nhập vào tài khoản QuizHub của bạn." },
    ],
  }),
  validateSearch: searchSchema,
  component: LoginPage,
});

const formSchema = z.object({
  email: z.string().email("Vui lòng nhập email hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});
type FormValues = z.infer<typeof formSchema>;

function LoginPage() {
  const { signIn, user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (!loading && user && profile) {
      const dest = search.redirect ?? (profile.role === "teacher" ? "/dashboard/subjects" : "/student");
      navigate({ to: dest });
    }
  }, [user, profile, loading, navigate, search.redirect]);

  const onSubmit = async (values: FormValues) => {
    try {
      await signIn(values.email, values.password);
      toast.success("Chào mừng bạn quay lại!");
      // Redirect is handled by the useEffect above once profile loads
    } catch (err) {
      const message = err instanceof Error ? err.message : "Đăng nhập thất bại";
      toast.error(message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-8 shadow-[var(--shadow-card)]">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)]">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">QuizHub</span>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Chào mừng quay lại</h1>
        <p className="mt-1 text-sm text-muted-foreground">Đăng nhập để tiếp tục.</p>

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Đăng nhập
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            ← Quay lại trang chủ
          </Link>
          <Link to="/register" className="text-primary hover:underline">
            Tạo tài khoản
          </Link>
        </div>
      </div>
    </div>
  );
}
