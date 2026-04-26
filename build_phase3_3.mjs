import fs from "fs";
import path from "path";

const files = {};

files["src/routes/dashboard.import.tsx"] =
  `import { createFileRoute } from "@tanstack/react-router";
import { ImportDocxView } from "@/components/dashboard/import/ImportDocxView";

export const Route = createFileRoute("/dashboard/import")({
  head: () => ({ meta: [{ title: "Import DOCX — QuizHub" }] }),
  component: ImportDocxView,
});
`;

files["src/components/dashboard/import/ImportDocxView.tsx"] = `import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as mammoth from "mammoth";
import { UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";
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
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      parseText(result.value);
    } catch (error) {
      toast.error("Error reading file.");
    } finally {
      setIsParsing(false);
    }
  };

  const parseText = (text: string) => {
    const lines = text.split("\\n").map(l => l.trim()).filter(l => l.length > 0);
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
        } else if (currentQ.options && currentQ.options.length > 0 && currentQ.options.length <= 4) {
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
    else if (!q.options || q.options.length !== 4) error = "Requires exactly 4 options (A, B, C, D)";
    else if (q.correct_answer === undefined || q.correct_answer < 0 || q.correct_answer > 3) error = "Missing or invalid correct answer";
    
    return {
      content: q.content || "",
      options: q.options && q.options.length === 4 ? q.options : Array.from({length: 4}, (_, i) => q.options?.[i] || ""),
      correct_answer: q.correct_answer !== undefined && q.correct_answer >= 0 ? q.correct_answer : 0,
      explanation: q.explanation || "",
      error
    };
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const validQuestions = parsedData.filter(q => !q.error);
      const payload = validQuestions.map(q => ({
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
          <p className="mt-1 text-sm text-muted-foreground">Upload a Word document to batch create questions.</p>
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
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium leading-none block mb-2">Upload File</label>
              <Button asChild variant="outline" className="w-full relative overflow-hidden">
                <label className="cursor-pointer">
                  <UploadCloud className="mr-2 h-4 w-4" />
                  {isParsing ? "Parsing..." : "Select .docx File"}
                  <input type="file" className="hidden" accept=".docx" onChange={handleFileUpload} disabled={isParsing} />
                </label>
              </Button>
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <h4 className="font-semibold text-foreground mb-2">Supported Format Rules:</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>Questions start with: <code className="text-primary">Câu 1:</code> or <code className="text-primary">1.</code></li>
              <li>Options start with: <code className="text-primary">A.</code>, <code className="text-primary">B)</code>, or <code className="text-primary">C/</code></li>
              <li>Correct answer line: <code className="text-primary">Đáp án: A</code> or <code className="text-primary">Correct: B</code></li>
              <li>Explanation line: <code className="text-primary">Giải thích: ...</code></li>
            </ul>
          </div>
        </div>
      </div>

      {parsedData.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Preview</h3>
            <Button 
              onClick={() => importMutation.mutate()} 
              disabled={!subjectId || parsedData.filter(q => !q.error).length === 0 || importMutation.isPending}
            >
              Import {parsedData.filter(q => !q.error).length} Valid Questions
            </Button>
          </div>
          <div className="rounded-md border">
            <table className="w-full text-sm">
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
                        <AlertCircle className="h-5 w-5 text-destructive mx-auto" title={q.error} />
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
                          {String.fromCharCode(65 + q.correct_answer)}. {q.options[q.correct_answer]}
                        </span>
                      ) : "-"}
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

Object.keys(files).forEach((file) => {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, files[file]);
  console.log("Created:", file);
});
