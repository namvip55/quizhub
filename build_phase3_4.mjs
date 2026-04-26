import fs from "fs";
import path from "path";

const files = {};

files["src/routes/dashboard.exams.tsx"] = `import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, Power, PowerOff } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExamFormDialog } from "@/components/dashboard/exams/ExamFormDialog";

export const Route = createFileRoute("/dashboard/exams")({
  head: () => ({ meta: [{ title: "Exams — QuizHub" }] }),
  component: ExamsPage,
});

function ExamsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: exams, isLoading } = useQuery({
    queryKey: ["exams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("*, subjects(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Exam deleted");
      queryClient.invalidateQueries({ queryKey: ["exams"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const publishMutation = useMutation({
    mutationFn: async ({ id, published }: { id: string, published: boolean }) => {
      const { error } = await supabase.from("exams").update({ published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.published ? "Exam published" : "Exam unpublished");
      queryClient.invalidateQueries({ queryKey: ["exams"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const filteredExams = exams?.filter((e) => {
    const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase()) || e.exam_code.toLowerCase().includes(search.toLowerCase());
    const matchesSubject = subjectFilter === "all" || e.subject_id === subjectFilter;
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Exams</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create and manage your exams.</p>
        </div>
        <Button onClick={() => { setEditingExam(null); setIsDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> New exam
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search title or code..."
            className="pl-9 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjects?.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      ) : filteredExams?.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-card/60 p-12 text-center text-sm text-muted-foreground">
          No exams found. Click "New exam" to create one.
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="p-4 font-medium">Title</th>
                <th className="p-4 font-medium">Subject</th>
                <th className="p-4 font-medium text-center">Code</th>
                <th className="p-4 font-medium text-center">Duration</th>
                <th className="p-4 font-medium text-center">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExams?.map((e) => (
                <tr key={e.id} className="border-b transition-colors hover:bg-muted/50">
                  <td className="p-4 font-medium">{e.title}</td>
                  <td className="p-4 text-muted-foreground">{e.subjects?.name || "Unknown"}</td>
                  <td className="p-4 text-center"><code className="bg-muted px-2 py-1 rounded">{e.exam_code}</code></td>
                  <td className="p-4 text-center">{e.duration} min</td>
                  <td className="p-4 text-center">
                    <span className={\`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold \${e.published ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-muted text-muted-foreground'}\`}>
                      {e.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => publishMutation.mutate({ id: e.id, published: !e.published })} title={e.published ? "Unpublish" : "Publish"}>
                        {e.published ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setEditingExam(e); setIsDialogOpen(true); }} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="Delete" onClick={() => {
                        if (confirm("Delete this exam?")) deleteMutation.mutate(e.id);
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isDialogOpen && (
        <ExamFormDialog 
          open={isDialogOpen} 
          onOpenChange={setIsDialogOpen} 
          exam={editingExam}
          subjects={subjects || []}
        />
      )}
    </div>
  );
}
`;

files["src/components/dashboard/exams/ExamFormDialog.tsx"] =
  `import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

const examSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subject_id: z.string().min(1, "Subject is required"),
  duration: z.coerce.number().min(1),
  allow_retry: z.boolean(),
  max_attempts: z.coerce.number().min(1),
  show_answer: z.boolean(),
  published: z.boolean(),
  questionMode: z.enum(["manual", "random"]),
  randomCount: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof examSchema>;

const generateCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export function ExamFormDialog({ open, onOpenChange, exam, subjects }: { open: boolean, onOpenChange: (open: boolean) => void, exam?: any, subjects: any[] }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [hasAttempts, setHasAttempts] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: "",
      subject_id: "",
      duration: 60,
      allow_retry: false,
      max_attempts: 1,
      show_answer: true,
      published: false,
      questionMode: "manual",
      randomCount: 10,
    },
  });

  const subjectId = form.watch("subject_id");

  const { data: questions } = useQuery({
    queryKey: ["questions", subjectId],
    queryFn: async () => {
      if (!subjectId) return [];
      const { data, error } = await supabase.from("questions").select("id, content").eq("subject_id", subjectId);
      if (error) throw error;
      return data;
    },
    enabled: !!subjectId,
  });

  useEffect(() => {
    if (open) {
      if (exam) {
        form.reset({
          title: exam.title,
          subject_id: exam.subject_id,
          duration: exam.duration,
          allow_retry: exam.allow_retry,
          max_attempts: exam.max_attempts,
          show_answer: exam.show_answer,
          published: exam.published,
          questionMode: "manual",
        });
        // Check if has attempts
        supabase.from("exam_attempts").select("id").eq("exam_id", exam.id).limit(1).then(({ data }) => {
          setHasAttempts(!!data?.length);
        });
        // Load selected questions
        supabase.from("exam_questions").select("question_id").eq("exam_id", exam.id).then(({ data }) => {
          setSelectedQuestions(data?.map(d => d.question_id) || []);
        });
      } else {
        form.reset({
          title: "",
          subject_id: subjects.length > 0 ? subjects[0].id : "",
          duration: 60,
          allow_retry: false,
          max_attempts: 1,
          show_answer: true,
          published: false,
          questionMode: "manual",
          randomCount: 10,
        });
        setSelectedQuestions([]);
        setHasAttempts(false);
      }
    }
  }, [open, exam, form, subjects]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      let finalQuestionIds = selectedQuestions;

      if (!exam && values.questionMode === "random") {
        if (!questions || questions.length === 0) throw new Error("No questions available in this subject.");
        const shuffled = [...questions].sort(() => 0.5 - Math.random());
        finalQuestionIds = shuffled.slice(0, values.randomCount).map(q => q.id);
      }

      if (finalQuestionIds.length === 0) {
        throw new Error("You must select at least one question.");
      }

      const payload = {
        title: values.title,
        subject_id: values.subject_id,
        duration: values.duration,
        allow_retry: values.allow_retry,
        max_attempts: values.allow_retry ? values.max_attempts : 1,
        show_answer: values.show_answer,
        published: values.published,
      };

      if (exam) {
        const { error } = await supabase.from("exams").update(payload).eq("id", exam.id);
        if (error) throw error;
        
        if (!hasAttempts) {
          await supabase.from("exam_questions").delete().eq("exam_id", exam.id);
          const eqPayload = finalQuestionIds.map((qId, i) => ({ exam_id: exam.id, question_id: qId, order_index: i }));
          const { error: eqError } = await supabase.from("exam_questions").insert(eqPayload);
          if (eqError) throw eqError;
        }
      } else {
        const { data, error } = await supabase.from("exams").insert({
          ...payload,
          exam_code: generateCode(),
          created_by: user!.id,
        }).select().single();
        if (error) throw error;

        const eqPayload = finalQuestionIds.map((qId, i) => ({ exam_id: data.id, question_id: qId, order_index: i }));
        const { error: eqError } = await supabase.from("exam_questions").insert(eqPayload);
        if (eqError) throw eqError;
      }
    },
    onSuccess: () => {
      toast.success(exam ? "Exam updated" : "Exam created");
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const toggleQuestion = (id: string) => {
    setSelectedQuestions(prev => prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{exam ? "Edit Exam" : "New Exam"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-6 overflow-y-auto pr-2">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input {...form.register("title")} />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select onValueChange={(val) => form.setValue("subject_id", val)} value={form.watch("subject_id")} disabled={!!exam}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input type="number" {...form.register("duration")} />
            </div>
            <div className="space-y-2">
              <Label>Max Attempts</Label>
              <Input type="number" {...form.register("max_attempts")} disabled={!form.watch("allow_retry")} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-md">
            <div className="flex items-center space-x-2">
              <Switch checked={form.watch("allow_retry")} onCheckedChange={(val) => form.setValue("allow_retry", val)} />
              <Label>Allow Retry</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch checked={form.watch("show_answer")} onCheckedChange={(val) => form.setValue("show_answer", val)} />
              <Label>Show Answer</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch checked={form.watch("published")} onCheckedChange={(val) => form.setValue("published", val)} />
              <Label>Publish Immediately</Label>
            </div>
          </div>

          {!hasAttempts && !exam && (
            <div className="space-y-4">
              <Label>Questions Selection</Label>
              <Tabs defaultValue="manual" onValueChange={(v) => form.setValue("questionMode", v as "manual" | "random")}>
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="manual">Manual Select</TabsTrigger>
                  <TabsTrigger value="random">Random Generation</TabsTrigger>
                </TabsList>
                <TabsContent value="manual" className="mt-4">
                  <div className="border rounded-md max-h-60 overflow-y-auto p-4 space-y-2">
                    {questions?.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center">No questions in this subject.</p>
                    ) : (
                      questions?.map((q) => (
                        <label key={q.id} className="flex items-start space-x-3 cursor-pointer p-2 hover:bg-muted/50 rounded">
                          <input 
                            type="checkbox" 
                            className="mt-1" 
                            checked={selectedQuestions.includes(q.id)} 
                            onChange={() => toggleQuestion(q.id)} 
                          />
                          <span className="text-sm line-clamp-2">{q.content}</span>
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{selectedQuestions.length} selected</p>
                </TabsContent>
                <TabsContent value="random" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Number of Questions to pull</Label>
                    <Input type="number" {...form.register("randomCount")} max={questions?.length || 0} />
                    <p className="text-xs text-muted-foreground">Available: {questions?.length || 0} questions.</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {hasAttempts && (
            <div className="p-4 bg-yellow-500/10 text-yellow-600 rounded-md text-sm">
              This exam already has attempts. Question list cannot be modified.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
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
