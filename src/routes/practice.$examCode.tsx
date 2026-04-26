import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
// @ts-ignore
import tingTingSound from "@/public/ting_ting.mp3";

export const Route = createFileRoute("/practice/$examCode")({
  head: () => ({ meta: [{ title: "Chế độ luyện tập — QuizHub" }] }),
  component: PracticeModeView,
});

function PracticeModeView() {
  const { examCode } = Route.useParams();
  const navigate = Route.useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [stagedAnswer, setStagedAnswer] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(tingTingSound);
  }, []);

  const { data: examData, isLoading } = useQuery({
    queryKey: ["practice-exam", examCode],
    queryFn: async () => {
      // 1. Fetch exam
      const { data: exam, error: examErr } = await supabase
        .from("exams")
        .select("*")
        .eq("exam_code", examCode)
        .single();

      if (examErr || !exam) throw new Error("Exam not found");

      // 2. Fetch questions via junction table
      const { data: junction, error: jErr } = await supabase
        .from("exam_questions")
        .select(`
          order_index,
          question:questions (
            id,
            content,
            options,
            correct_answer,
            explanation
          )
        `)
        .eq("exam_id", exam.id)
        .order("order_index", { ascending: true });

      if (jErr) throw jErr;

      // Extract and format questions
      const questions = junction
        .map((j) => j.question)
        .filter((q): q is NonNullable<typeof q> => q !== null);

      return { exam, questions };
    },
  });

  const handleSelectAnswer = (optionIdx: number) => {
    // If already confirmed, don't change
    if (selectedAnswers[currentIndex] !== undefined) return;
    setStagedAnswer(optionIdx);
  };

  const confirmAnswer = () => {
    if (stagedAnswer === null || selectedAnswers[currentIndex] !== undefined) return;

    const optionIdx = stagedAnswer;
    setSelectedAnswers((prev) => ({ ...prev, [currentIndex]: optionIdx }));
    
    const isCorrect = optionIdx === currentQuestion.correct_answer;
    if (isCorrect) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.log("Audio play blocked", e));
      }
    }
    setStagedAnswer(null);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((c) => c + 1);
      setStagedAnswer(null);
    } else {
      setIsFinished(true);
    }
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!examData || !examData.questions || examData.questions.length === 0 || isFinished) return;

      if (e.key === 'Enter') {
        if (selectedAnswers[currentIndex] !== undefined) {
          handleNext();
        } else if (stagedAnswer !== null) {
          confirmAnswer();
        }
        return;
      }

      if (selectedAnswers[currentIndex] !== undefined) {
        if (e.key === 'ArrowRight') handleNext();
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
          setCurrentIndex(c => c - 1);
          setStagedAnswer(null);
        }
        return;
      }

      if (e.key >= '1' && e.key <= '4') {
        handleSelectAnswer(parseInt(e.key) - 1);
      } else if (['a', 'A'].includes(e.key)) {
        handleSelectAnswer(0);
      } else if (['b', 'B'].includes(e.key)) {
        handleSelectAnswer(1);
      } else if (['c', 'C'].includes(e.key)) {
        handleSelectAnswer(2);
      } else if (['d', 'D'].includes(e.key)) {
        handleSelectAnswer(3);
      } else if (e.key === 'ArrowRight' && currentIndex < examData.questions.length - 1) {
        handleNext();
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(c => c - 1);
        setStagedAnswer(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [examData, currentIndex, selectedAnswers, stagedAnswer, isFinished]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!examData || examData.questions.length === 0) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h2 className="text-2xl font-bold">Không tìm thấy bài thi hoặc bài thi không có câu hỏi</h2>
        <Button className="mt-4" onClick={() => navigate({ to: "/student" })}>Quay lại</Button>
      </div>
    );
  }

  const { exam, questions } = examData;

  if (isFinished) {
    const correctCount = questions.filter((q: any, i: number) => selectedAnswers[i] === q.correct_answer).length;
    return (
      <div className="container mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="bg-card rounded-2xl border p-8 shadow-sm">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-2">Hoàn thành luyện tập!</h2>
          <p className="text-muted-foreground mb-8">Bạn đã trả lời đúng {correctCount} / {questions.length} câu hỏi.</p>
          
          <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4">
            <Button variant="outline" size="lg" onClick={() => navigate({ to: "/student" })} className="w-full">
              Quay lại danh sách
            </Button>
            <Button size="lg" onClick={() => {
              setCurrentIndex(0);
              setSelectedAnswers({});
              setStagedAnswer(null);
              setIsFinished(false);
            }} className="w-full">
              Luyện tập lại
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const hasAnsweredCurrent = selectedAnswers[currentIndex] !== undefined;
  const isCurrentCorrect = selectedAnswers[currentIndex] === currentQuestion.correct_answer;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30 pb-12">
      <div className="bg-background border-b border-border/60 sticky top-16 z-30">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 sm:hidden"
              onClick={() => {
                if (confirm("Bạn có chắc muốn thoát? Tiến trình luyện tập sẽ không được lưu.")) {
                  navigate({ to: "/student" });
                }
              }}
            >
              <XCircle className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold truncate text-sm sm:text-base">{exam.title}</h1>
            <span className="bg-primary/10 text-primary text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium shrink-0">Luyện tập</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm font-bold text-primary shrink-0 bg-primary/10 px-3 py-1.5 rounded-md">
              Câu {currentIndex + 1} / {questions.length}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex border-destructive/20 text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (confirm("Bạn có chắc muốn thoát? Tiến trình luyện tập sẽ không được lưu.")) {
                  navigate({ to: "/student" });
                }
              }}
            >
              Thoát
            </Button>
          </div>
        </div>
        <div className="h-1 bg-muted w-full">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 pt-8">
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden transition-all">
          <div className="p-6 sm:p-8">
            <h3 className="text-xl sm:text-2xl font-medium leading-relaxed whitespace-pre-wrap">
              <div dangerouslySetInnerHTML={{ __html: currentQuestion.content }} />
            </h3>
          </div>

          <div className="p-6 sm:p-8 pt-0 flex flex-col gap-3">
            {currentQuestion.options.map((option: string, idx: number) => {
              let btnClass = "border-border/60 hover:bg-muted/50 hover:border-primary/30";
              let icon = <span className="flex h-7 w-7 items-center justify-center rounded-md border text-sm font-semibold">{idx + 1}</span>;

              if (hasAnsweredCurrent) {
                if (idx === currentQuestion.correct_answer) {
                  btnClass = "border-green-500 bg-green-500/20 text-green-600 dark:text-green-400 font-medium";
                  icon = <CheckCircle2 className="h-6 w-6 text-green-500" />;
                } else if (idx === selectedAnswers[currentIndex]) {
                  btnClass = "border-destructive/50 bg-destructive/10 text-destructive font-medium";
                  icon = <XCircle className="h-6 w-6 text-destructive" />;
                } else {
                  btnClass = "border-border/30 opacity-40";
                }
              } else if (stagedAnswer === idx) {
                btnClass = "border-primary bg-primary/5 ring-1 ring-primary";
              }

              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (stagedAnswer === idx) confirmAnswer();
                    else handleSelectAnswer(idx);
                  }}
                  disabled={hasAnsweredCurrent}
                  className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all ${btnClass}`}
                >
                  {icon}
                  <span className="text-base sm:text-lg">
                    <div dangerouslySetInnerHTML={{ __html: option }} className="inline-block" />
                  </span>
                </button>
              );
            })}
          </div>

          {/* Feedback Section */}
          {hasAnsweredCurrent && (
            <div className={`p-6 sm:p-8 border-t ${isCurrentCorrect ? "bg-green-500/5 border-green-500/20" : "bg-destructive/5 border-destructive/20"}`}>
              <h4 className={`text-lg font-semibold mb-2 ${isCurrentCorrect ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                {isCurrentCorrect ? "🎉 Chính xác!" : "Sai rồi!"}
              </h4>
              {currentQuestion.explanation && (
                <div className="mt-4 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap p-4 bg-background/50 rounded-lg border">
                  <span className="font-semibold text-foreground block mb-1">Giải thích:</span>
                  <div dangerouslySetInnerHTML={{ __html: currentQuestion.explanation }} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setCurrentIndex((c) => c - 1)}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="mr-2 h-5 w-5" /> Câu trước
          </Button>
          
          {hasAnsweredCurrent ? (
            <Button
              size="lg"
              onClick={handleNext}
            >
              {currentIndex < questions.length - 1 ? (
                <>Câu tiếp <ChevronRight className="ml-2 h-5 w-5" /></>
              ) : (
                "Hoàn thành"
              )}
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={confirmAnswer}
              disabled={stagedAnswer === null}
            >
              Kiểm tra <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
