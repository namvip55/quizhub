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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: search.redirect as string | undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Tạo tài khoản — QuizHub" },
      { name: "description", content: "Tạo tài khoản QuizHub miễn phí." },
    ],
  }),
  component: RegisterPage,
});

const formSchema = z.object({
  full_name: z.string().min(2, "Vui lòng nhập họ và tên"),
  email: z.string().email("Vui lòng nhập email hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  role: z.enum(["teacher", "student"]),
});
type FormValues = z.infer<typeof formSchema>;

function RegisterPage() {
  const { signUp, user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { full_name: "", email: "", password: "", role: "student" },
  });

  useEffect(() => {
    if (!loading && user && profile) {
      const dest = search.redirect ?? (profile.role === "teacher" ? "/dashboard/subjects" : "/student");
      navigate({ to: dest });
    }
  }, [user, profile, loading, navigate, search.redirect]);

  const onSubmit = async (values: FormValues) => {
    try {
      await signUp(values);
      toast.success("Tạo tài khoản thành công — bạn đã được đăng nhập.");
      // Redirect is handled by the useEffect above once profile loads
    } catch (err) {
      const message = err instanceof Error ? err.message : "Đăng ký thất bại";
      toast.error(message);
    }
  };

  const role = form.watch("role");

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-8 shadow-[var(--shadow-card)]">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)]">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">QuizHub</span>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Tạo tài khoản</h1>
        <p className="mt-1 text-sm text-muted-foreground">Miễn phí sử dụng và bắt đầu dễ dàng.</p>

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Họ và tên</Label>
            <Input id="full_name" placeholder="Nguyễn Văn A" {...form.register("full_name")} />
            {form.formState.errors.full_name && (
              <p className="text-xs text-destructive">{form.formState.errors.full_name.message}</p>
            )}
          </div>
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
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tôi là</Label>
            <RadioGroup
              value={role}
              onValueChange={(v) => form.setValue("role", v as "teacher" | "student")}
              className="grid grid-cols-2 gap-3"
            >
              {(["student", "teacher"] as const).map((r) => (
                <Label
                  key={r}
                  htmlFor={`role-${r}`}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm capitalize transition ${
                    role === r
                      ? "border-primary bg-accent"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <RadioGroupItem id={`role-${r}`} value={r} />
                  {r === "teacher" ? "Giáo viên" : "Học sinh"}
                </Label>
              ))}
            </RadioGroup>
          </div>

          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Đăng ký
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            ← Quay lại trang chủ
          </Link>
          <Link to="/login" className="text-primary hover:underline">
            Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
