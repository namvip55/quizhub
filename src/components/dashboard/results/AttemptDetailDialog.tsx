import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";

export function AttemptDetailDialog({
  attempt,
  open,
  onOpenChange,
}: {
  attempt: any;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
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
          order_index: eq.order_index,
        };
      });
    },
    enabled: !!attempt && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết bài làm - {attempt?.student_name}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            <div className="flex gap-6 border-b pb-4">
              <div>
                <p className="text-sm text-muted-foreground">Điểm số</p>
                <p className="text-2xl font-bold">{attempt?.score?.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Số câu đúng</p>
                <p className="text-xl font-medium">
                  {details?.filter((d: any) => d.isCorrect).length} / {details?.length}
                </p>
              </div>
            </div>

            <div className="space-y-8">
              {details?.map((q: any, i: number) => (
                <div key={q.id} className="border rounded-lg p-4 bg-card shadow-sm space-y-4">
                  <div className="flex gap-3">
                    <div className="mt-1">
                      {q.isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm mb-2 text-muted-foreground">
                        Câu {i + 1}
                      </div>
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
                      if (isStudentChoice && isCorrectChoice)
                        boxClass += "border-green-500 bg-green-500/10";
                      else if (isStudentChoice && !isCorrectChoice)
                        boxClass += "border-destructive bg-destructive/10";
                      else if (!isStudentChoice && isCorrectChoice)
                        boxClass += "border-green-500/50 bg-green-500/5";
                      else boxClass += "border-border bg-muted/30";

                      return (
                        <div key={optIdx} className={boxClass}>
                          <span className="font-semibold mr-2">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
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
