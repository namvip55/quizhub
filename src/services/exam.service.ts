import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Exam = Tables<"exams">;
export type Question = Tables<"questions">;

export const examService = {
  getExamByCode: async (code: string): Promise<Exam | null> => {
    const { data, error } = await supabase
      .from("exams")
      .select("*")
      .eq("exam_code", code.toUpperCase())
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }
    return data;
  },

  getExamQuestions: async (examId: string): Promise<Question[]> => {
    const { data: junction, error: jErr } = await supabase
      .from("exam_questions")
      .select(
        `
        order_index,
        question:questions (*)
      `,
      )
      .eq("exam_id", examId)
      .order("order_index", { ascending: true });

    if (jErr) throw jErr;

    return junction.map((j) => j.question as Question).filter((q): q is Question => q !== null);
  },
};
