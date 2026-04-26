import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, ChevronRight, FileText, Upload, UploadCloud, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import mammoth from "mammoth";

const generateCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

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
  const navigate = useNavigate();
  const [subjectId, setSubjectId] = useState<string>("");
  const [parsedData, setParsedData] = useState<ParsedQuestion[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName] = useState("");

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
    setFileName(file.name);

    if (!file.name.endsWith(".docx")) {
      toast.error("Vui lòng tải lên file .docx.");
      return;
    }

    setIsParsing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      // Use convertToHtml to preserve highlights as <mark> tags
      const options = {
        styleMap: [
          "highlight[color='yellow'] => mark.highlight-yellow",
          "highlight[color='green'] => mark.highlight-green"
        ]
      };
      const result = await mammoth.convertToHtml({ arrayBuffer }, options);
      parseHtmlText(result.value);
    } catch (error) {
      toast.error("Lỗi khi đọc hoặc xử lý file DOCX.");
      console.error(error);
    } finally {
      setIsParsing(false);
    }
  };

  const parseHtmlText = (html: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const questions: ParsedQuestion[] = [];

    let currentQ: Partial<ParsedQuestion> = { options: [] };

    const questionRegex = /^(Câu\s+\d+|Question\s+\d+|\d+[\[\.\)])\s*(.*)/i;
    const optionRegex = /^([A-D])[\[\.\/\)]\s*(.*)/i;
    const answerRegex = /^(Đáp\s*án|ĐA|Correct)[:\s]*([A-D])/i;
    const explainRegex = /^(Giải\s*thích|Explanation)[:\s]*(.*)/i;

    let isExplaining = false;

    // mammoth converts paragraphs to <p> tags
    Array.from(doc.body.children).forEach((el) => {
      const text = el.textContent?.trim() || "";
      if (!text) return;

      const qMatch = text.match(questionRegex);
      const oMatch = text.match(optionRegex);
      const aMatch = text.match(answerRegex);
      const eMatch = text.match(explainRegex);
      
      const hasMark = el.querySelector("mark") !== null;

      if (qMatch) {
        if (currentQ.content) questions.push(finalizeQuestion(currentQ));
        currentQ = { content: qMatch[2] || text, options: [], correct_answer: -1, explanation: "" };
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
        
        if (hasMark) currentQ.correct_answer = idx;
      } else {
        if (isExplaining) {
          currentQ.explanation += "\n" + text;
        } else if (
          currentQ.options &&
          currentQ.options.length > 0 &&
          currentQ.options.length <= 4
        ) {
          currentQ.options[currentQ.options.length - 1] += "\n" + text;
          if (hasMark) currentQ.correct_answer = currentQ.options.length - 1;
        } else if (currentQ.content) {
          currentQ.content += "\n" + text;
        }
      }
    });

    if (currentQ.content) questions.push(finalizeQuestion(currentQ));
    setParsedData(questions);
  };

  const finalizeQuestion = (q: Partial<ParsedQuestion>): ParsedQuestion => {
    let error;
    if (!q.content) error = "Thiếu nội dung câu hỏi";
    else if (!q.options || q.options.length !== 4)
      error = "Cần chính xác 4 lựa chọn (A, B, C, D)";
    else if (q.correct_answer === undefined || q.correct_answer < 0 || q.correct_answer > 3)
      error = "Thiếu hoặc sai đáp án đúng (Đảm bảo đã bôi màu đáp án trong file DOCX)";

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

  const updateQuestion = (index: number, field: keyof ParsedQuestion, value: any) => {
    setParsedData((prev) => {
      const newData = [...prev];
      newData[index] = finalizeQuestion({ ...newData[index], [field]: value, error: undefined });
      return newData;
    });
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const validQuestions = parsedData.filter((q) => !q.error);
      const questionsPayload = validQuestions.map((q) => ({
        subject_id: subjectId,
        content: q.content,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation || null,
        created_by: user!.id,
      }));

      // 1. Create Exam
      const { data: examData, error: examError } = await supabase.from("exams").insert({
        title: "Đề từ file " + fileName,
        duration: 60,
        published: false,
        subject_id: subjectId,
        exam_code: generateCode(),
        created_by: user!.id,
      }).select().single();

      if (examError) throw examError;

      // 2. Insert questions
      const { data: qData, error: qError } = await supabase.from("questions").insert(questionsPayload).select("id");
      if (qError) throw qError;

      // 3. Map questions to exam
      const eqPayload = qData.map((q, idx) => ({
        exam_id: examData.id,
        question_id: q.id,
        order_index: idx
      }));

      const { error: eqError } = await supabase.from("exam_questions").insert(eqPayload);
      if (eqError) throw eqError;

      return examData.id;
    },
    onSuccess: (examId) => {
      toast.success("Đã tạo đề thi từ file thành công!");
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      setParsedData([]);
      navigate({ to: "/dashboard/exams", search: { edit: examId } });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nhập từ file DOCX</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tải lên tài liệu Word để tạo hàng loạt câu hỏi.
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium leading-none">Chọn môn học</label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Chọn một môn học..." />
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
              <label className="text-sm font-medium leading-none block mb-2">Tải file lên</label>
              <Button asChild variant="outline" className="w-full relative overflow-hidden" disabled={isParsing}>
                <label className="cursor-pointer">
                  {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                  {isParsing ? "Đang xử lý DOCX..." : "Chọn file .docx"}
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
            <h4 className="font-semibold text-foreground mb-2">Quy tắc định dạng được hỗ trợ:</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                Câu hỏi bắt đầu bằng: <code className="text-primary">Câu 1:</code> hoặc{" "}
                <code className="text-primary">1.</code>
              </li>
              <li>
                Lựa chọn bắt đầu bằng: <code className="text-primary">A.</code>,{" "}
                <code className="text-primary">B)</code>, hoặc{" "}
                <code className="text-primary">C/</code>
              </li>
              <li>
                Đáp án đúng: Tô màu <strong>vàng</strong> hoặc <strong>xanh lá</strong> cho lựa chọn đó, HOẶC viết <code className="text-primary">Đáp án: A</code>
              </li>
              <li>
                Dòng giải thích: <code className="text-primary">Giải thích: ...</code>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {parsedData.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h3 className="text-lg font-medium">Xem trước</h3>
            <Button
              onClick={() => importMutation.mutate()}
              disabled={
                !subjectId ||
                parsedData.filter((q) => !q.error).length === 0 ||
                importMutation.isPending
              }
            >
              {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Nhập {parsedData.filter((q) => !q.error).length} câu hỏi hợp lệ
            </Button>
          </div>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="p-4 w-12 text-center">Trạng thái</th>
                  <th className="p-4">Biên tập câu hỏi</th>
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
                      <div className="space-y-3">
                        <textarea
                          className="w-full min-h-[60px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={q.content}
                          onChange={(e) => updateQuestion(idx, "content", e.target.value)}
                          placeholder="Nội dung câu hỏi..."
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-start gap-2">
                              <input
                                type="radio"
                                className="mt-2.5"
                                name={`q-${idx}-answer`}
                                checked={q.correct_answer === oIdx}
                                onChange={() => updateQuestion(idx, "correct_answer", oIdx)}
                              />
                              <textarea
                                className={`w-full min-h-[40px] rounded-md border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                                  q.correct_answer === oIdx
                                    ? "bg-green-100 dark:bg-green-900/30 border-green-500/50"
                                    : "bg-transparent border-input"
                                }`}
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...q.options];
                                  newOpts[oIdx] = e.target.value;
                                  updateQuestion(idx, "options", newOpts);
                                }}
                                placeholder={`Lựa chọn ${String.fromCharCode(65 + oIdx)}...`}
                              />
                            </div>
                          ))}
                        </div>
                        {q.explanation && (
                          <textarea
                            className="w-full min-h-[40px] rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={q.explanation}
                            onChange={(e) => updateQuestion(idx, "explanation", e.target.value)}
                            placeholder="Giải thích..."
                          />
                        )}
                        {q.error && <p className="text-xs text-destructive mt-1 font-medium">{q.error}</p>}
                      </div>
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
