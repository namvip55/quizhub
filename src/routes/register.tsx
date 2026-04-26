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
  head: () => ({
    meta: [
      { title: "Create account — QuizHub" },
      { name: "description", content: "Create a free QuizHub account." },
    ],
  }),
  component: RegisterPage,
});

const formSchema = z.object({
  full_name: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
  role: z.enum(["teacher", "student"]),
});
type FormValues = z.infer<typeof formSchema>;

function RegisterPage() {
  const { signUp, user, loading } = useAuth();
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { full_name: "", email: "", password: "", role: "student" },
  });

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const onSubmit = async (values: FormValues) => {
    try {
      await signUp(values);
      toast.success("Account created — you're signed in.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign up failed";
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
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Free forever for getting started.</p>

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" placeholder="Jane Doe" {...form.register("full_name")} />
            {form.formState.errors.full_name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.full_name.message}
              </p>
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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>I am a</Label>
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
                  {r}
                </Label>
              ))}
            </RadioGroup>
          </div>

          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create account
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            ← Back home
          </Link>
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
