import fs from "fs";
import path from "path";

const files = {};

files["src/routes/dashboard.questions.tsx"] =
  `import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, Copy } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QuestionFormDialog } from "@/components/dashboard/questions/QuestionFormDialog";

export const Route = createFileRoute("/dashboard/questions")({
  head: () => ({ meta: [{ title: "Questions — QuizHub" }] }),
  component: QuestionsPage,
});

function QuestionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: questions, isLoading } = useQuery({
    queryKey: ["questions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*, subjects(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Question deleted");
      queryClient.invalidateQueries({ queryKey: ["questions"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (question: any) => {
      const { id, created_at, updated_at, ...copy } = question;
      const { error } = await supabase.from("questions").insert(copy);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Question duplicated");
      queryClient.invalidateQueries({ queryKey: ["questions"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const filteredQuestions = questions?.filter((q) => {
    const matchesSearch = q.content.toLowerCase().includes(search.toLowerCase());
    const matchesSubject = subjectFilter === "all" || q.subject_id === subjectFilter;
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Question Bank</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your reusable questions.</p>
        </div>
        <Button onClick={() => { setEditingQuestion(null); setIsDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> New question
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search content..."
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
      ) : filteredQuestions?.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-card/60 p-12 text-center text-sm text-muted-foreground">
          No questions found. Try importing or creating one manually.
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="p-4 font-medium">Content</th>
                <th className="p-4 font-medium w-[200px]">Subject</th>
                <th className="p-4 font-medium w-[150px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuestions?.map((q) => (
                <tr key={q.id} className="border-b transition-colors hover:bg-muted/50">
                  <td className="p-4">
                    <p className="line-clamp-2">{q.content}</p>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                      {q.subjects?.name || "Unknown"}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => duplicateMutation.mutate(q)} title="Duplicate">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setEditingQuestion(q); setIsDialogOpen(true); }} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="Delete" onClick={() => {
                        if (confirm("Delete this question?")) deleteMutation.mutate(q.id);
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
        <QuestionFormDialog 
          open={isDialogOpen} 
          onOpenChange={setIsDialogOpen} 
          question={editingQuestion}
          subjects={subjects || []}
        />
      )}
    </div>
  );
}
`;

files["src/components/dashboard/questions/QuestionFormDialog.tsx"] =
  `import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import ReactMarkdown from "react-markdown";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const questionSchema = z.object({
  subject_id: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Question content is required"),
  option_0: z.string().min(1, "Option A is required"),
  option_1: z.string().min(1, "Option B is required"),
  option_2: z.string().min(1, "Option C is required"),
  option_3: z.string().min(1, "Option D is required"),
  correct_answer: z.string().min(1),
  explanation: z.string().optional(),
});

type FormValues = z.infer<typeof questionSchema>;

export function QuestionFormDialog({ open, onOpenChange, question, subjects }: { open: boolean, onOpenChange: (open: boolean) => void, question?: any, subjects: any[] }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [previewContent, setPreviewContent] = useState("");
  
  const form = useForm<FormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      subject_id: "",
      content: "",
      option_0: "",
      option_1: "",
      option_2: "",
      option_3: "",
      correct_answer: "0",
      explanation: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (question) {
        const options = question.options as string[];
        form.reset({
          subject_id: question.subject_id,
          content: question.content,
          option_0: options[0] || "",
          option_1: options[1] || "",
          option_2: options[2] || "",
          option_3: options[3] || "",
          correct_answer: question.correct_answer.toString(),
          explanation: question.explanation || "",
        });
        setPreviewContent(question.content);
      } else {
        form.reset({
          subject_id: subjects.length > 0 ? subjects[0].id : "",
          content: "",
          option_0: "",
          option_1: "",
          option_2: "",
          option_3: "",
          correct_answer: "0",
          explanation: "",
        });
        setPreviewContent("");
      }
    }
  }, [open, question, form, subjects]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        subject_id: values.subject_id,
        content: values.content,
        options: [values.option_0, values.option_1, values.option_2, values.option_3],
        correct_answer: parseInt(values.correct_answer),
        explanation: values.explanation || null,
      };

      if (question) {
        const { error } = await supabase.from("questions").update(payload).eq("id", question.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("questions").insert({
          ...payload,
          created_by: user!.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(question ? "Question updated" : "Question created");
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{question ? "Edit Question" : "New Question"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select onValueChange={(val) => form.setValue("subject_id", val)} value={form.watch("subject_id")}>
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.subject_id && <p className="text-xs text-destructive">{form.formState.errors.subject_id.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Content (Markdown)</Label>
              <Textarea 
                className="h-32" 
                {...form.register("content")} 
                onChange={(e) => {
                  form.setValue("content", e.target.value);
                  setPreviewContent(e.target.value);
                }} 
              />
              {form.formState.errors.content && <p className="text-xs text-destructive">{form.formState.errors.content.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="h-32 overflow-auto rounded-md border p-4 prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{previewContent}</ReactMarkdown>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Answers & Correct Choice</Label>
            <RadioGroup onValueChange={(val) => form.setValue("correct_answer", val)} value={form.watch("correct_answer")}>
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <RadioGroupItem value={idx.toString()} id={\`radio-\${idx}\`} />
                  <div className="flex-1">
                    <Input placeholder={\`Option \${String.fromCharCode(65 + idx)}\`} {...form.register(\`option_\${idx}\` as any)} />
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Explanation (Optional)</Label>
            <Textarea {...form.register("explanation")} placeholder="Markdown supported..." />
          </div>

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
