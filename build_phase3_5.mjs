import fs from "fs";
import path from "path";

const files = {};

files["src/routes/dashboard.results.tsx"] =
  `import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { AttemptDetailDialog } from "@/components/dashboard/results/AttemptDetailDialog";

export const Route = createFileRoute("/dashboard/results")({
  head: () => ({ meta: [{ title: "Results — QuizHub" }] }),
  component: ResultsPage,
});

function ResultsPage() {
  const [selectedExam, setSelectedExam] = useState<string>("all");
  const [viewingAttempt, setViewingAttempt] = useState<any>(null);

  const { data: exams } = useQuery({
    queryKey: ["exams-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("exams").select("id, title").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: attempts, isLoading } = useQuery({
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
  });

  const calculateStats = () => {
    if (!attempts || attempts.length === 0) return null;
    const scores = attempts.map(a => a.score || 0);
    const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    const passCount = scores.filter(s => s >= 5).length; // Assuming 5 is pass on a 10 scale
    const passRate = ((passCount / scores.length) * 100).toFixed(0);

    const histogram = Array.from({ length: 11 }, (_, i) => ({ name: i.toString(), count: 0 }));
    scores.forEach(s => {
      const bucket = Math.round(s);
      if (histogram[bucket]) histogram[bucket].count++;
    });

    return { avgScore, passRate, total: scores.length, histogram };
  };

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Results & Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Monitor student performance and exam statistics.</p>
        </div>
        <Select value={selectedExam} onValueChange={setSelectedExam}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select an exam" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Exams</SelectItem>
            {exams?.map((e) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      ) : !stats ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-card/60 p-12 text-center text-sm text-muted-foreground">
          No results found.
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
              <p className="mt-2 text-3xl font-bold">{stats.avgScore} / 10</p>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground">Pass Rate (≥ 5)</h3>
              <p className="mt-2 text-3xl font-bold">{stats.passRate}%</p>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-medium mb-4">Score Distribution</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.histogram}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-md border bg-card">
            <table className="w-full text-sm">
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
                  const timeSpentStr = a.started_at && a.submitted_at 
                    ? \`\${Math.floor((new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()) / 60000)}m\`
                    : "-";
                  return (
                    <tr key={a.id} className="border-b transition-colors hover:bg-muted/50 cursor-pointer" onClick={() => setViewingAttempt(a)}>
                      <td className="p-4 font-medium">{a.student_name}</td>
                      {selectedExam === "all" && <td className="p-4 text-muted-foreground">{a.exams?.title}</td>}
                      <td className="p-4 text-center font-bold text-primary">{a.score?.toFixed(1) || 0}</td>
                      <td className="p-4 text-center">{timeSpentStr}</td>
                      <td className="p-4 text-right text-muted-foreground">
                        {a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "-"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {viewingAttempt && (
        <AttemptDetailDialog attempt={viewingAttempt} open={!!viewingAttempt} onOpenChange={(val) => !val && setViewingAttempt(null)} />
      )}
    </div>
  );
}
`;

files["src/components/dashboard/results/AttemptDetailDialog.tsx"] =
  `import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";

export function AttemptDetailDialog({ attempt, open, onOpenChange }: { attempt: any, open: boolean, onOpenChange: (v: boolean) => void }) {
  
  const { data: details, isLoading } = useQuery({
    queryKey: ["attempt-details", attempt?.id],
    queryFn: async () => {
      // Fetch the questions for this exam to compare answers
      const { data: eqData, error: eqError } = await supabase
        .from("exam_questions")
        .select("order_index, questions(*)")
        .eq("exam_id", attempt.exam_id)
        .order("order_index");
      
      if (eqError) throw eqError;

      const studentAnswers = attempt.answers as Record<string, number>;
      
      return eqData.map((eq: any) => {
        const q = eq.questions;
        const studentAns = studentAnswers[q.id];
        const isCorrect = studentAns === q.correct_answer;
        return {
          ...q,
          studentAns,
          isCorrect,
          order_index: eq.order_index
        };
      });
    },
    enabled: !!attempt && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Attempt Details - {attempt?.student_name}</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            <div className="flex gap-6 border-b pb-4">
              <div>
                <p className="text-sm text-muted-foreground">Score</p>
                <p className="text-2xl font-bold">{attempt?.score?.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Correct Answers</p>
                <p className="text-xl font-medium">{details?.filter((d: any) => d.isCorrect).length} / {details?.length}</p>
              </div>
            </div>

            <div className="space-y-8">
              {details?.map((q: any, i: number) => (
                <div key={q.id} className="border rounded-lg p-4 bg-card shadow-sm space-y-4">
                  <div className="flex gap-3">
                    <div className="mt-1">
                      {q.isCorrect ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-destructive" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm mb-2 text-muted-foreground">Question {i + 1}</div>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{q.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8">
                    {(q.options as string[]).map((opt, optIdx) => {
                      const isStudentChoice = q.studentAns === optIdx;
                      const isCorrectChoice = q.correct_answer === optIdx;
                      
                      let boxClass = "border p-2 rounded-md text-sm ";
                      if (isStudentChoice && isCorrectChoice) boxClass += "border-green-500 bg-green-500/10";
                      else if (isStudentChoice && !isCorrectChoice) boxClass += "border-destructive bg-destructive/10";
                      else if (!isStudentChoice && isCorrectChoice) boxClass += "border-green-500/50 bg-green-500/5";
                      else boxClass += "border-border bg-muted/30";

                      return (
                        <div key={optIdx} className={boxClass}>
                          <span className="font-semibold mr-2">{String.fromCharCode(65 + optIdx)}.</span>
                          {opt}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
