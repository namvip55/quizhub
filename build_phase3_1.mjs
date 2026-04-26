import fs from "fs";
import path from "path";

const files = {};

files["src/components/auth/AuthGuard.tsx"] = `import { useEffect, type ReactNode } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export function AuthGuard({ children, requireRole }: { children: ReactNode; requireRole?: "teacher" | "student" }) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate({
          to: "/login",
          search: { redirect: location.pathname },
        });
      } else if (requireRole && profile?.role !== requireRole) {
        navigate({ to: "/" });
      }
    }
  }, [loading, user, profile, navigate, location.pathname, requireRole]);

  if (loading || (!user) || (requireRole && profile?.role !== requireRole)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
`;

files["src/routes/dashboard.tsx"] =
  `import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, UserCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — QuizHub" },
      { name: "description", content: "Manage your subjects, questions, exams, and results." },
    ],
  }),
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <AuthGuard requireRole="teacher">
      <DashboardShell />
    </AuthGuard>
  );
}

function DashboardShell() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/login" });
  };

  const displayName = profile?.full_name || user?.email || "Account";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="flex-1" />
            {profile?.role && (
              <span className="hidden rounded-full border border-border/60 bg-card px-2.5 py-0.5 text-xs capitalize text-muted-foreground sm:inline-block">
                {profile.role}
              </span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account">
                  <UserCircle2 className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
`;

files["src/routes/dashboard.subjects.tsx"] =
  `import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { SubjectFormDialog } from "@/components/dashboard/subjects/SubjectFormDialog";

export const Route = createFileRoute("/dashboard/subjects")({
  head: () => ({ meta: [{ title: "Subjects — QuizHub" }] }),
  component: SubjectsPage,
});

function SubjectsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);

  const { data: subjects, isLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subjects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subject deleted");
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (error) => {
      toast.error("Error deleting subject: " + error.message);
    },
  });

  const filteredSubjects = subjects?.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Subjects</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your subject categories.</p>
        </div>
        <Button onClick={() => { setEditingSubject(null); setIsDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> New subject
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search subjects..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      ) : filteredSubjects?.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-card/60 p-12 text-center text-sm text-muted-foreground">
          No subjects found. Create your first subject to get started.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects?.map((subject) => (
            <div key={subject.id} className="rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col p-6">
              <div className="flex-1">
                <h3 className="font-semibold leading-none tracking-tight">{subject.name}</h3>
                {subject.description && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{subject.description}</p>
                )}
              </div>
              <div className="mt-6 flex items-center justify-end gap-2">
                <Button variant="outline" size="icon" onClick={() => { setEditingSubject(subject); setIsDialogOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10" 
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this subject?")) {
                      deleteMutation.mutate(subject.id);
                    }
                  }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <SubjectFormDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        subject={editingSubject} 
      />
    </div>
  );
}
`;

files["src/components/dashboard/subjects/SubjectFormDialog.tsx"] =
  `import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

const subjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type SubjectFormValues = z.infer<typeof subjectSchema>;

export function SubjectFormDialog({ open, onOpenChange, subject }: { open: boolean, onOpenChange: (open: boolean) => void, subject?: any }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (open) {
      if (subject) {
        form.reset({ name: subject.name, description: subject.description || "" });
      } else {
        form.reset({ name: "", description: "" });
      }
    }
  }, [open, subject, form]);

  const mutation = useMutation({
    mutationFn: async (values: SubjectFormValues) => {
      if (subject) {
        const { error } = await supabase.from("subjects").update(values).eq("id", subject.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("subjects").insert({
          ...values,
          teacher_id: user!.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(subject ? "Subject updated" : "Subject created");
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{subject ? "Edit Subject" : "New Subject"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...form.register("description")} />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
`;

Object.keys(files).forEach((file) => {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, files[file]);
  console.log("Created:", file);
});
