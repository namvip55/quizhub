import fs from "fs";
import path from "path";

const files = {};

files["src/routes/enter.tsx"] =
  `import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/enter")({
  head: () => ({ meta: [{ title: "Enter Exam — QuizHub" }] }),
  component: EnterExamPage,
});

function EnterExamPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error("Exam code must be 6 characters");
      return;
    }

    setLoading(true);
    try {
      const { data: exam, error } = await supabase
        .from("exams")
        .select("*")
        .eq("exam_code", code.toUpperCase())
        .single();

      if (error || !exam) {
        toast.error("Exam not found");
        setLoading(false);
        return;
      }

      if (!exam.published) {
        toast.error("This exam is not published yet.");
        setLoading(false);
        return;
      }

      // Check max attempts logic will be fully handled in lobby, for now proceed
      navigate({ to: "/lobby/$examCode", params: { examCode: code.toUpperCase() } });
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] mb-4">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Join Exam</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the 6-character code provided by your teacher.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="code" className="sr-only">Exam Code</Label>
            <Input
              id="code"
              placeholder="e.g., A1B2C3"
              className="text-center text-2xl tracking-widest uppercase h-14"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </div>
          <Button type="submit" className="w-full h-11" disabled={loading || code.length !== 6}>
            {loading ? "Checking..." : "Continue"}
          </Button>
        </form>
      </div>
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
import { Clock, FileText, CheckCircle2 } from "lucide-react";

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
      return data;
    },
    onSuccess: (data) => {
      navigate({ to: "/exam/$attemptId", params: { attemptId: data.id } });
    },
    onError: (error) => toast.error(error.message),
  });

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-t-primary" /></div>;
  }

  if (error || !exam) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Exam Not Found</h1>
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
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Duration</p>
              <p className="text-2xl font-bold">{exam.duration} <span className="text-sm font-normal text-muted-foreground">min</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Questions</p>
              <p className="text-2xl font-bold">{questionCount}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          <h3 className="font-semibold flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Exam Rules</h3>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
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
            disabled={!studentName.trim() || startMutation.isPending}
          >
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
