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
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  FileText,
  Upload,
  UploadCloud,
  Loader2,
} from "lucide-react";
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

const extractCorrectAnswersByQuestion = async (arrayBuffer: ArrayBuffer): Promise<number[]> => {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(arrayBuffer);
  const documentXml = await zip.file("word/document.xml")?.async("string");

  if (!documentXml) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(documentXml, "application/xml");
  const paragraphs = Array.from(doc.getElementsByTagNameNS("*", "p"));
  const correctAnswers: number[] = [];
  const questionRegex = /^\s*(Câu\s+\d+|Question\s+\d+|Bài\s+\d+|\d+[[.)])(?:\s*\[<DE>\])?[:\s]*/i;

  const getRunText = (run: Element) =>
    Array.from(run.getElementsByTagNameNS("*", "t"))
      .map((node) => node.textContent || "")
      .join("");

  const hasRunColorOrHighlight = (run: Element) => {
    const properties = run.getElementsByTagNameNS("*", "rPr")[0];
    if (!properties) return false;

    return (
      properties.getElementsByTagNameNS("*", "color").length > 0 ||
      properties.getElementsByTagNameNS("*", "highlight").length > 0 ||
      properties.getElementsByTagNameNS("*", "shd").length > 0
    );
  };

  let currentQuestionIndex = -1;
  let currentOptionIndex = 0;

  paragraphs.forEach((paragraph) => {
    const runs = Array.from(paragraph.getElementsByTagNameNS("*", "r"));
    const paragraphText = runs.map(getRunText).join("").trim();

    if (!paragraphText) return;

    if (questionRegex.test(paragraphText)) {
      currentQuestionIndex += 1;
      currentOptionIndex = 0;
      correctAnswers[currentQuestionIndex] = -1;
      return;
    }

    if (!paragraphText.includes("[<$>]")) return;
    if (currentQuestionIndex < 0) return;

    const hasStyledMarker = runs.some((run) => {
      if (!hasRunColorOrHighlight(run)) return false;
      const runText = getRunText(run).replace(/\s+/g, "");
      return /[[<>$]/.test(runText);
    });

    if (hasStyledMarker) {
      correctAnswers[currentQuestionIndex] = currentOptionIndex;
    }

    currentOptionIndex += 1;
  });

  return correctAnswers;
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
    queryKey: ["subjects", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name")
        .eq("teacher_id", user.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
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
      const correctAnswersByQuestion = await extractCorrectAnswersByQuestion(arrayBuffer);
      // Use convertToHtml to preserve highlights as <mark> tags
      const options = {
        styleMap: [
          "highlight[color='yellow'] => mark.highlight-yellow",
          "highlight[color='green'] => mark.highlight-green",
          // Word standard font colors
          "r[color='FF0000'] => mark.color-red",
          "r[color='C00000'] => mark.color-darkred",
          "r[color='FFFF00'] => mark.color-yellow",
          "r[color='00FF00'] => mark.color-green",
          "r[color='00B050'] => mark.color-stdgreen",
          "r[color='92D050'] => mark.color-lightgreen",
        ],
      };
      const result = await mammoth.convertToHtml({ arrayBuffer }, options);
      parseHtmlText(result.value, correctAnswersByQuestion);
    } catch (error) {
      toast.error("Lỗi khi đọc hoặc xử lý file DOCX.");
      console.error(error);
    } finally {
      setIsParsing(false);
    }
  };

  const parseHtmlText = (html: string, correctAnswersByQuestion: number[]) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const questions: ParsedQuestion[] = [];

    let currentQ: Partial<ParsedQuestion> = { options: [] };
    let currentQuestionIndex = -1;

    const questionRegex =
      /^\s*(Câu\s+\d+|Question\s+\d+|Bài\s+\d+|\d+[.[.\]])(?:\s*\[<DE>\])?[:\s]*(.*)/i;
    const optionRegex = /^\s*(\*\s*)?(?:([A-D1-4])(?:\s*[[./)]\s*|\s+)|\[<\$>\]\s*)(.*)/i;
    const answerRegex = /^\s*(Đáp\s*án|ĐA|Correct)[:\s]*([A-D1-4])/i;
    const explainRegex = /^\s*(Giải\s*thích|Explanation)[:\s]*(.*)/i;

    let isExplaining = false;

    // Regex to detect multiple inline options on one line
    // Matches patterns like: A. xxx  B. xxx  C. xxx  D. xxx  or  1. xxx  2. xxx  3. xxx  4. xxx
    // Also handles *A. xxx (asterisk marking correct answer)
    const inlineOptionsRegex =
      /((?:\*\s*[A-Da-d1-4](?:\s*[[./)]\s*|\s+))|(?:(?:^|\s+)[A-Da-d1-4]\s*[[./)]))|(\[<\$>\])/g;

    const stripHintTags = (html: string) => {
      // Remove <mark> tags but keep their content
      let cleaned = html.replace(/<mark[^>]*>(.*?)<\/mark>/gi, "$1");
      // Also remove markers if they are still present after tag stripping
      cleaned = cleaned.replace(/\[<\$>\]\s*/gi, "");
      cleaned = cleaned.replace(/\[<DE>\]\s*/gi, "");
      cleaned = cleaned.replace(/\[&lt;\$&gt;\]\s*/gi, "");
      cleaned = cleaned.replace(/\[&lt;DE&gt;\]\s*/gi, "");
      // Remove "Câu X:", "Question X:", etc. prefixes
      cleaned = cleaned.replace(/^\s*(?:Câu|Question|Bài|Bài tập)\s+\d+\s*[:.]?\s*/i, "");
      // Remove "A.", "B.", etc. prefixes for options
      cleaned = cleaned.replace(/^\s*[A-D1-4]\s*[[./)]\s*/i, "");
      return cleaned.trim();
    };

    const hasCorrectAnswerHint = (el: Element) => {
      return (
        el.querySelector(
          [
            "mark",
            "span[style*='color']",
            "span[class*='color']",
            "span[class*='highlight']",
            "font[color]",
          ].join(", "),
        ) !== null
      );
    };

    const tryParseInlineOptions = (
      text: string,
      htmlContent: string,
      hasCorrectHint: boolean,
    ): boolean => {
      const matches = text.match(inlineOptionsRegex);
      if (!matches || matches.length < 2) return false;

      const parts = text.split(inlineOptionsRegex);
      const extracted: { label: string; content: string; isAsterisk: boolean }[] = [];
      for (let i = 1; i < parts.length; i += 2) {
        const marker = parts[i] || "";
        const content = (parts[i + 1] || "").trim();
        const isAst = marker.trim().startsWith("*");
        const labelMatch = marker.match(/([A-Da-d1-4])/);
        const isSpecialMarker = marker.includes("[<$>]");
        if (labelMatch || isSpecialMarker) {
          const label = labelMatch
            ? labelMatch[1].toUpperCase()
            : String.fromCharCode(65 + extracted.length);
          extracted.push({ label, content, isAsterisk: isAst });
        }
      }

      if (extracted.length < 2) return false;

      for (let i = 0; i < extracted.length; i++) {
        const lbl = extracted[i].label;
        const expectedLetter = String.fromCharCode(65 + i);
        const expectedNum = String(i + 1);
        if (lbl !== expectedLetter && lbl !== expectedNum) return false;
      }

      if (parts[0].trim().length > 0) {
        let qText = parts[0].trim();
        const qPrefixMatch = qText.match(questionRegex);
        if (qPrefixMatch) {
          qText = qText.replace(questionRegex, "$2").trim();
        }
        currentQ.content = qText;
        currentQ.options = [];
      }

      extracted.forEach((opt, i) => {
        // Clean the option content from marks
        currentQ.options![i] = stripHintTags(opt.content);
        if (opt.isAsterisk || hasCorrectHint) currentQ.correct_answer = i;
      });
      isExplaining = false;
      return true;
    };

    // mammoth converts paragraphs to <p> tags
    Array.from(doc.body.children).forEach((el) => {
      const text = el.textContent?.trim() || "";
      const htmlContent = el.innerHTML || "";
      if (!text && !el.querySelector("img")) return;

      const qMatch = text.match(questionRegex);
      const oMatch = text.match(optionRegex);
      const aMatch = text.match(answerRegex);
      const eMatch = text.match(explainRegex);

      const xmlCorrectAnswer =
        currentQuestionIndex >= 0 ? correctAnswersByQuestion[currentQuestionIndex] : -1;
      const hasCorrectHint = hasCorrectAnswerHint(el);

      // --- Bare asterisk: "* option text" without A/B/C/D prefix ---
      // Treat as the next option and mark it correct
      const bareAsteriskMatch = text.match(/^\*\s*(.+)$/);
      const isBareAsterisk = bareAsteriskMatch && !oMatch; // don't double-count if oMatch already catches *A.

      // --- Detect start of a new question (either with prefix or all-in-one line) ---
      const isInlineWithQuestion =
        text.match(inlineOptionsRegex) && text.split(inlineOptionsRegex)[0].trim().length > 0;

      if (qMatch || isInlineWithQuestion) {
        if (currentQ.content) questions.push(finalizeQuestion(currentQ));
        currentQuestionIndex += 1;

        if (qMatch) {
          currentQ = {
            content: stripHintTags(htmlContent),
            options: [],
            correct_answer: correctAnswersByQuestion[currentQuestionIndex] ?? -1,
            explanation: "",
          };
          isExplaining = false;
          // Try to see if there are inline options on this same line
          tryParseInlineOptions(text, htmlContent, hasCorrectHint);
          return;
        } else {
          // All-in-one line without "Câu X" prefix (e.g., "Question text. A. b B. c")
          currentQ = {
            content: "",
            options: [],
            correct_answer: correctAnswersByQuestion[currentQuestionIndex] ?? -1,
            explanation: "",
          };
          tryParseInlineOptions(text, htmlContent, hasCorrectHint);
          return;
        }
      }

      // --- Try inline multi-option for lines that are ONLY options ---
      if (
        currentQ.content &&
        currentQ.options!.length === 0 &&
        tryParseInlineOptions(text, htmlContent, hasCorrectHint)
      ) {
        // Successfully parsed inline options, skip other checks
        return;
      }

      let matchedAsOption = false;
      let optIdx = -1;
      let isAsterisk = false;

      if (
        (oMatch || text.startsWith("[<$>]")) &&
        currentQ.content &&
        currentQ.options!.length < 4
      ) {
        const optLabel = oMatch ? oMatch[2]?.toUpperCase() : null;
        if (optLabel) {
          optIdx = /[1-4]/.test(optLabel) ? parseInt(optLabel) - 1 : optLabel.charCodeAt(0) - 65;
        } else {
          // Case for [<$>] marker - take next available index
          optIdx = currentQ.options!.length;
        }

        // Prioritize option if it strictly follows the sequence or it's the expected next option
        if (optIdx === currentQ.options!.length) {
          matchedAsOption = true;
          isAsterisk = oMatch ? !!oMatch[1] : false;
        }
      }

      if (matchedAsOption) {
        // Clean HTML from hints but keep structures
        // We use stripHintTags directly because it now handles the custom markers
        currentQ.options![optIdx] = stripHintTags(htmlContent);
        isExplaining = false;

        if (hasCorrectHint || isAsterisk || xmlCorrectAnswer === optIdx)
          currentQ.correct_answer = optIdx;
      } else if (isBareAsterisk && currentQ.content && currentQ.options!.length < 4) {
        // Bare * line — clean it up
        const optContent = stripHintTags(htmlContent.replace(/^\*\s*/, ""));
        const nextIdx = currentQ.options!.length;
        currentQ.options![nextIdx] = optContent;
        currentQ.correct_answer = nextIdx;
        isExplaining = false;
      } else if (aMatch) {
        const ansLabel = aMatch[2].toUpperCase();
        currentQ.correct_answer = /[1-4]/.test(ansLabel)
          ? parseInt(ansLabel) - 1
          : ansLabel.charCodeAt(0) - 65;
        isExplaining = false;
      } else if (eMatch) {
        currentQ.explanation = htmlContent.replace(explainRegex, "$2") || "";
        isExplaining = true;
      } else {
        if (isExplaining) {
          currentQ.explanation += "<br/>" + htmlContent;
        } else if (
          currentQ.options &&
          currentQ.options.length > 0 &&
          currentQ.options.length <= 4
        ) {
          currentQ.options[currentQ.options.length - 1] += "<br/>" + htmlContent;
          if (hasCorrectHint) currentQ.correct_answer = currentQ.options.length - 1;
        } else if (currentQ.content) {
          currentQ.content += "<br/>" + htmlContent;
        } else {
          // Start first question if the line doesn't match any special pattern
          currentQ.content = htmlContent;
        }
      }
    });

    if (currentQ.content) questions.push(finalizeQuestion(currentQ));
    setParsedData(questions);
  };

  const finalizeQuestion = (q: Partial<ParsedQuestion>): ParsedQuestion => {
    const normalizedOptions = (q.options || []).filter(
      (option): option is string => typeof option === "string" && option.trim().length > 0,
    );

    let error;
    if (!q.content) error = "Thiếu nội dung câu hỏi";
    else if (normalizedOptions.length !== 4) error = "Cần chính xác 4 lựa chọn (A, B, C, D)";
    else if (q.correct_answer === undefined || q.correct_answer < 0 || q.correct_answer > 3)
      error =
        "Thiếu hoặc sai đáp án đúng (Đảm bảo marker [<$>] của đáp án đúng được tô màu trong file DOCX)";

    return {
      content: q.content || "",
      options:
        normalizedOptions.length === 4
          ? normalizedOptions
          : Array.from({ length: 4 }, (_, i) => normalizedOptions[i] || ""),
      correct_answer:
        q.correct_answer !== undefined && q.correct_answer >= 0 ? q.correct_answer : 0,
      explanation: q.explanation || "",
      error,
    };
  };

  const updateQuestion = (
    index: number,
    field: keyof ParsedQuestion,
    value: string | string[] | number,
  ) => {
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
      const { data: examData, error: examError } = await supabase
        .from("exams")
        .insert({
          title: "Đề từ file " + fileName,
          duration: 60,
          published: false,
          allow_retry: true,
          max_attempts: 36,
          subject_id: subjectId,
          exam_code: generateCode(),
          created_by: user!.id,
        })
        .select()
        .single();

      if (examError) throw examError;

      // 2. Insert questions
      const { data: qData, error: qError } = await supabase
        .from("questions")
        .insert(questionsPayload)
        .select("id");
      if (qError) throw qError;

      // 3. Map questions to exam
      const eqPayload = qData.map((q, idx) => ({
        exam_id: examData.id,
        question_id: q.id,
        order_index: idx,
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
              <Button
                asChild
                variant="outline"
                className="w-full relative overflow-hidden"
                disabled={isParsing}
              >
                <label className="cursor-pointer">
                  {isParsing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="mr-2 h-4 w-4" />
                  )}
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
                Câu hỏi bắt đầu bằng: <code className="text-primary">Câu 1:</code>,{" "}
                <code className="text-primary">1.</code>, hoặc{" "}
                <code className="text-primary">Câu 1 [&lt;DE&gt;]:</code>
              </li>
              <li>
                Lựa chọn bắt đầu bằng: <code className="text-primary">A.</code>,{" "}
                <code className="text-primary">B)</code>, hoặc marker{" "}
                <code className="text-primary">[&lt;$&gt;]</code>
              </li>
              <li>
                Đáp án đúng: Tô màu <strong>đỏ</strong>, <strong>vàng</strong> hoặc{" "}
                <strong>xanh lá</strong> cho lựa chọn đó, HOẶC dùng dấu{" "}
                <code className="text-primary">*</code> ở đầu dòng.
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
                        <span title={q.error}>
                          <AlertCircle className="h-5 w-5 text-destructive mx-auto" />
                        </span>
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
                              <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-foreground">
                                {String.fromCharCode(65 + oIdx)}
                              </div>
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
                                    ? "border-emerald-500/70 bg-emerald-50 text-slate-900 shadow-sm dark:border-emerald-400/60 dark:bg-emerald-950/45 dark:text-emerald-50"
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
                        {q.error && (
                          <p className="text-xs text-destructive mt-1 font-medium">{q.error}</p>
                        )}
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
