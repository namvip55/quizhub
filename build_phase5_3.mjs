import fs from "fs";
import path from "path";

const files = {};

files["src/routes/dashboard.questions.tsx"] =
  `import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, Copy, ChevronLeft, ChevronRight, AlertTriangle, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QuestionFormDialog } from "@/components/dashboard/questions/QuestionFormDialog";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/dashboard/questions")({
  head: () => ({ meta: [{ title: "Questions — QuizHub" }] }),
  component: QuestionsPage,
});

const PAGE_SIZE = 20;

function QuestionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [page, setPage] = useState(0);

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: queryResult, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["questions", page, subjectFilter, search],
    queryFn: async () => {
      let query = supabase
        .from("questions")
        .select("*, subjects(name)", { count: "exact" });
      
      if (subjectFilter !== "all") {
        query = query.eq("subject_id", subjectFilter);
      }
      if (search) {
        query = query.ilike("content", \`%\${search}%\`);
      }

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data, count };
    },
    staleTime: 60 * 1000,
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

  const questions = queryResult?.data || [];
  const totalCount = queryResult?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Question Bank</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your reusable questions.</p>
        </div>
        <Button
          onClick={() => {
            setEditingQuestion(null);
            setIsDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> New question
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            className="pl-9 w-full"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <Select 
          value={subjectFilter} 
          onValueChange={(v) => {
            setSubjectFilter(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects?.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-xl bg-card">
          <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
          <p className="font-semibold mb-2">Network Error</p>
          <p className="text-sm text-muted-foreground mb-4">Could not load questions. Please check your connection.</p>
          <Button onClick={() => refetch()} variant="outline">
            {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Try Again"}
          </Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/60 p-12 text-center text-sm text-muted-foreground">
          <Search className="h-8 w-8 text-muted-foreground/50 mb-4" />
          <p className="font-medium text-foreground mb-1">No questions found</p>
          <p>Try adjusting your search or filter to find what you're looking for.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q: any) => (
            <div key={q.id} className="rounded-xl border bg-card p-6 shadow-sm transition-colors hover:bg-muted/30">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                      {q.subjects?.name || "Unknown Subject"}
                    </span>
                  </div>
                  <p className="text-sm font-medium line-clamp-3">{q.content}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground mt-2">
                    {(q.options as string[]).map((opt, i) => (
                      <div key={i} className={\`p-2 rounded-md border \${i === q.correct_answer ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400 font-medium' : 'bg-muted/30'}\`}>
                        {String.fromCharCode(65 + i)}. {opt}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex sm:flex-col gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 sm:flex-none justify-start"
                    onClick={() => {
                      setEditingQuestion(q);
                      setIsDialogOpen(true);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 sm:flex-none justify-start text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                    onClick={() => duplicateMutation.mutate(q)}
                    disabled={duplicateMutation.isPending}
                  >
                    <Copy className="mr-2 h-4 w-4" /> Duplicate
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 sm:flex-none justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this question?")) {
                        deleteMutation.mutate(q.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {page * PAGE_SIZE + 1} to {Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {isDialogOpen && (
        <QuestionFormDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          initialData={editingQuestion}
        />
      )}
    </div>
  );
}
`;

files["src/routes/dashboard.results.tsx"] =
  `import { createFileRoute } from "@tanstack/react-router";
import { useState, memo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { AttemptDetailDialog } from "@/components/dashboard/results/AttemptDetailDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/results")({
  head: () => ({ meta: [{ title: "Results — QuizHub" }] }),
  component: ResultsPage,
});

// React.memo to prevent chart re-rendering unnecessarily
const MemoizedChart = memo(function MemoizedChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: "transparent" }} />
        <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
});

function ResultsPage() {
  const [selectedExam, setSelectedExam] = useState<string>("all");
  const [viewingAttempt, setViewingAttempt] = useState<any>(null);

  const { data: exams, isLoading: examsLoading } = useQuery({
    queryKey: ["exams-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("id, title")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: attempts, isLoading: attemptsLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["attempts", selectedExam],
    queryFn: async () => {
      let query = supabase.from("exam_attempts").select("*, exams(title)").eq("is_finished", true);
      if (selectedExam !== "all") {
        query = query.eq("exam_id", selectedExam);
      }
      const { data, error } = await query.order("submitted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000,
  });

  const calculateStats = () => {
    if (!attempts || attempts.length === 0) return null;
    const scores = attempts.map((a) => a.score || 0);
    const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    const passCount = scores.filter((s) => s >= 5).length;
    const passRate = ((passCount / scores.length) * 100).toFixed(0);

    const histogram = Array.from({ length: 11 }, (_, i) => ({ name: i.toString(), count: 0 }));
    scores.forEach((s) => {
      const bucket = Math.round(s);
      if (histogram[bucket]) histogram[bucket].count++;
    });

    return { avgScore, passRate, total: scores.length, histogram };
  };

  const stats = calculateStats();
  const isLoading = examsLoading || attemptsLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Results & Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor student performance and exam statistics.
          </p>
        </div>
        <Select value={selectedExam} onValueChange={setSelectedExam}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue placeholder="Select an exam" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Exams</SelectItem>
            {exams?.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-xl bg-card">
          <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
          <p className="font-semibold mb-2">Network Error</p>
          <p className="text-sm text-muted-foreground mb-4">Could not load results. Please try again.</p>
          <Button onClick={() => refetch()} variant="outline">
            {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Try Again"}
          </Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
          <Skeleton className="h-[300px] w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : !stats ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/60 p-12 text-center text-sm text-muted-foreground">
          <Search className="h-8 w-8 text-muted-foreground/50 mb-4" />
          <p className="font-medium text-foreground mb-1">No results found</p>
          <p>There are no completed attempts for the selected exam yet.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground">Total Attempts</h3>
              <p className="mt-2 text-3xl font-bold">{stats.total}</p>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground">Average Score</h3>
              <p className="mt-2 text-3xl font-bold">{stats.avgScore} <span className="text-sm font-normal text-muted-foreground">/ 10</span></p>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground">Pass Rate (≥ 5)</h3>
              <p className="mt-2 text-3xl font-bold">{stats.passRate}%</p>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
            <h3 className="text-lg font-medium mb-4">Score Distribution</h3>
            <div className="h-[250px] sm:h-[300px] w-full">
              <MemoizedChart data={stats.histogram} />
            </div>
          </div>

          {/* Responsive list/table for attempts */}
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="md:hidden divide-y">
              {attempts?.map((a) => {
                const timeSpentStr =
                  a.started_at && a.submitted_at
                    ? \`\${Math.floor((new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()) / 60000)}m\`
                    : "-";
                return (
                  <div key={a.id} className="p-4 space-y-2 cursor-pointer hover:bg-muted/50" onClick={() => setViewingAttempt(a)}>
                    <div className="flex justify-between items-start">
                      <div className="font-medium">{a.student_name}</div>
                      <div className="font-bold text-primary">{a.score?.toFixed(1) || 0}</div>
                    </div>
                    {selectedExam === "all" && <div className="text-xs text-muted-foreground">{a.exams?.title}</div>}
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Time: {timeSpentStr}</span>
                      <span>{a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "-"}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="p-4 font-medium">Student Name</th>
                  {selectedExam === "all" && <th className="p-4 font-medium">Exam</th>}
                  <th className="p-4 font-medium text-center">Score</th>
                  <th className="p-4 font-medium text-center">Time Spent</th>
                  <th className="p-4 font-medium text-right">Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {attempts?.map((a) => {
                  const timeSpentStr =
                    a.started_at && a.submitted_at
                      ? \`\${Math.floor((new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()) / 60000)}m\`
                      : "-";
                  return (
                    <tr
                      key={a.id}
                      className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                      onClick={() => setViewingAttempt(a)}
                    >
                      <td className="p-4 font-medium">{a.student_name}</td>
                      {selectedExam === "all" && (
                        <td className="p-4 text-muted-foreground">{a.exams?.title}</td>
                      )}
                      <td className="p-4 text-center font-bold text-primary">
                        {a.score?.toFixed(1) || 0}
                      </td>
                      <td className="p-4 text-center">{timeSpentStr}</td>
                      <td className="p-4 text-right text-muted-foreground">
                        {a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {viewingAttempt && (
        <AttemptDetailDialog
          attempt={viewingAttempt}
          open={!!viewingAttempt}
          onOpenChange={(val) => !val && setViewingAttempt(null)}
        />
      )}
    </div>
  );
}
`;

Object.keys(files).forEach((file) => {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, files[file]);
  console.log("Created:", file);
});
