import fs from "fs";
import path from "path";

const files = {};

files["src/components/dashboard/import/ImportDocxView.tsx"] = `import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UploadCloud, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

type ParsedQuestion = {
  content: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  error?: string;
};

export function ImportDocxView() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [subjectId, setSubjectId] = useState<string>("");
  const [parsedData, setParsedData] = useState<ParsedQuestion[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".docx")) {
      toast.error("Please upload a .docx file.");
      return;
    }

    setIsParsing(true);
    try {
      // Dynamic import for mammoth to code-split this heavy ~200kb library
      const mammoth = await import("mammoth");
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      parseText(result.value);
    } catch (error) {
      toast.error("Error reading file or parsing DOCX.");
      console.error(error);
    } finally {
      setIsParsing(false);
    }
  };

  const parseText = (text: string) => {
    const lines = text
      .split("\\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const questions: ParsedQuestion[] = [];

    let currentQ: Partial<ParsedQuestion> = { options: [] };

    const questionRegex = /^(Câu\\s+\\d+|Question\\s+\\d+|\\d+[\\[\\.\\)])\\s*(.*)/i;
    const optionRegex = /^([A-D])[\\[\\.\\/\\)]\\s*(.*)/i;
    const answerRegex = /^(Đáp\\s*án|ĐA|Correct)[:\\s]*([A-D])/i;
    const explainRegex = /^(Giải\\s*thích|Explanation)[:\\s]*(.*)/i;

    let isExplaining = false;

    lines.forEach((line) => {
      const qMatch = line.match(questionRegex);
      const oMatch = line.match(optionRegex);
      const aMatch = line.match(answerRegex);
      const eMatch = line.match(explainRegex);

      if (qMatch) {
        if (currentQ.content) {
          questions.push(finalizeQuestion(currentQ));
        }
        currentQ = { content: qMatch[2] || line, options: [], correct_answer: -1, explanation: "" };
        isExplaining = false;
      } else if (aMatch) {
        currentQ.correct_answer = aMatch[2].toUpperCase().charCodeAt(0) - 65;
        isExplaining = false;
      } else if (eMatch) {
        currentQ.explanation = eMatch[2] || "";
        isExplaining = true;
      } else if (oMatch && currentQ.options!.length < 4) {
        const optLetter = oMatch[1].toUpperCase();
        const idx = optLetter.charCodeAt(0) - 65;
        currentQ.options![idx] = oMatch[2];
        isExplaining = false;
      } else {
        if (isExplaining) {
          currentQ.explanation += "\\n" + line;
        } else if (
          currentQ.options &&
          currentQ.options.length > 0 &&
          currentQ.options.length <= 4
        ) {
          currentQ.options[currentQ.options.length - 1] += "\\n" + line;
        } else if (currentQ.content) {
          currentQ.content += "\\n" + line;
        }
      }
    });

    if (currentQ.content) {
      questions.push(finalizeQuestion(currentQ));
    }

    setParsedData(questions);
  };

  const finalizeQuestion = (q: Partial<ParsedQuestion>): ParsedQuestion => {
    let error;
    if (!q.content) error = "Missing content";
    else if (!q.options || q.options.length !== 4)
      error = "Requires exactly 4 options (A, B, C, D)";
    else if (q.correct_answer === undefined || q.correct_answer < 0 || q.correct_answer > 3)
      error = "Missing or invalid correct answer";

    return {
      content: q.content || "",
      options:
        q.options && q.options.length === 4
          ? q.options
          : Array.from({ length: 4 }, (_, i) => q.options?.[i] || ""),
      correct_answer:
        q.correct_answer !== undefined && q.correct_answer >= 0 ? q.correct_answer : 0,
      explanation: q.explanation || "",
      error,
    };
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const validQuestions = parsedData.filter((q) => !q.error);
      const payload = validQuestions.map((q) => ({
        subject_id: subjectId,
        content: q.content,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation || null,
        created_by: user!.id,
      }));

      const { error } = await supabase.from("questions").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Questions imported successfully");
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      setParsedData([]);
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Import DOCX</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a Word document to batch create questions.
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium leading-none">Select Subject</label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose a subject..." />
                </SelectTrigger>
                <SelectContent>
                  {subjects?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium leading-none block mb-2">Upload File</label>
              <Button asChild variant="outline" className="w-full relative overflow-hidden" disabled={isParsing}>
                <label className="cursor-pointer">
                  {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                  {isParsing ? "Parsing DOCX..." : "Select .docx File"}
                  <input
                    type="file"
                    className="hidden"
                    accept=".docx"
                    onChange={handleFileUpload}
                    disabled={isParsing}
                  />
                </label>
              </Button>
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <h4 className="font-semibold text-foreground mb-2">Supported Format Rules:</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                Questions start with: <code className="text-primary">Câu 1:</code> or{" "}
                <code className="text-primary">1.</code>
              </li>
              <li>
                Options start with: <code className="text-primary">A.</code>,{" "}
                <code className="text-primary">B)</code>, or{" "}
                <code className="text-primary">C/</code>
              </li>
              <li>
                Correct answer line: <code className="text-primary">Đáp án: A</code> or{" "}
                <code className="text-primary">Correct: B</code>
              </li>
              <li>
                Explanation line: <code className="text-primary">Giải thích: ...</code>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {parsedData.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h3 className="text-lg font-medium">Preview</h3>
            <Button
              onClick={() => importMutation.mutate()}
              disabled={
                !subjectId ||
                parsedData.filter((q) => !q.error).length === 0 ||
                importMutation.isPending
              }
            >
              {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import {parsedData.filter((q) => !q.error).length} Valid Questions
            </Button>
          </div>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="p-4 w-12 text-center">Status</th>
                  <th className="p-4">Content</th>
                  <th className="p-4">Answer</th>
                </tr>
              </thead>
              <tbody>
                {parsedData.map((q, idx) => (
                  <tr key={idx} className="border-b transition-colors">
                    <td className="p-4 text-center">
                      {q.error ? (
                        <span title={q.error}><AlertCircle className="h-5 w-5 text-destructive mx-auto" /></span>
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                      )}
                    </td>
                    <td className="p-4">
                      <p className="line-clamp-2 font-medium">{q.content}</p>
                      {q.error && <p className="text-xs text-destructive mt-1">{q.error}</p>}
                    </td>
                    <td className="p-4">
                      {q.options[q.correct_answer] ? (
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-green-500/10 text-green-600 border-green-500/20">
                          {String.fromCharCode(65 + q.correct_answer)}.{" "}
                          {q.options[q.correct_answer]}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
`;

files["src/routes/lobby.$examCode.tsx"] =
  `import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Clock, FileText, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/lobby/$examCode")({
  head: () => ({ meta: [{ title: "Exam Lobby — QuizHub" }] }),
  component: LobbyPage,
});

function LobbyPage() {
  const { examCode } = Route.useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [studentName, setStudentName] = useState(profile?.full_name || "");

  const { data: exam, isLoading, error } = useQuery({
    queryKey: ["exam-lobby", examCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("*, exam_questions(count)")
        .eq("exam_code", examCode)
        .eq("published", true)
        .single();
      if (error) throw error;
      return data;
    },
    retry: false,
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      if (!exam) throw new Error("Exam not found");
      
      const { data, error } = await supabase.from("exam_attempts").insert({
        exam_id: exam.id,
        student_id: user?.id || null,
        student_name: studentName,
        is_finished: false,
        answers: {},
        started_at: new Date().toISOString(),
      }).select("id").single();
      
      if (error) throw error;
      
      // Store anonymous token so user can view their own result later if not logged in
      if (!user) {
        localStorage.setItem(\`anon_token_\${data.id}\`, "true");
      }
      
      return data;
    },
    onSuccess: (data) => {
      navigate({ to: "/exam/$attemptId", params: { attemptId: data.id } });
    },
    onError: (error) => toast.error(error.message),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Skeleton className="w-full max-w-lg h-[400px] rounded-xl" />
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Exam Not Found</h1>
        <p className="text-muted-foreground mb-8">The exam code might be invalid or the exam is no longer published.</p>
        <Button onClick={() => navigate({ to: "/enter" })}>Return</Button>
      </div>
    );
  }

  const questionCount = exam.exam_questions?.[0]?.count || 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-card p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">{exam.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Please review the details below before starting.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
            <Clock className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">Duration</p>
              <p className="text-2xl font-bold">{exam.duration} <span className="text-sm font-normal text-muted-foreground">min</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">Questions</p>
              <p className="text-2xl font-bold">{questionCount}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          <h3 className="font-semibold flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Exam Rules</h3>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-2">
            <li>Timer cannot be paused once started.</li>
            <li>The exam will automatically submit when time expires.</li>
            <li>Make sure you have a stable internet connection.</li>
            {exam.allow_retry ? (
              <li>You can attempt this exam up to {exam.max_attempts} times.</li>
            ) : (
              <li>This exam can only be taken once.</li>
            )}
          </ul>
        </div>

        <div className="space-y-6 border-t pt-6">
          {!user && (
            <div className="space-y-2">
              <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
              />
            </div>
          )}
          
          <Button 
            className="w-full h-11 text-lg" 
            onClick={() => startMutation.mutate()} 
            disabled={(!user && !studentName.trim()) || startMutation.isPending}
          >
            {startMutation.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {startMutation.isPending ? "Starting..." : "Start Exam Now"}
          </Button>
        </div>
      </div>
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
