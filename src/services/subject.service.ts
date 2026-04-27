import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Subject = Tables<"subjects">;

export const subjectService = {
  getTeacherSubjects: async (userId: string): Promise<Subject[]> => {
    const { data, error } = await supabase
      .from("subjects")
      .select("*")
      .eq("teacher_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  createSubject: async (payload: TablesInsert<"subjects">): Promise<Subject> => {
    const { data, error } = await supabase.from("subjects").insert([payload]).select().single();

    if (error) throw error;
    return data;
  },

  updateSubject: async (id: string, payload: TablesUpdate<"subjects">): Promise<Subject> => {
    const { data, error } = await supabase
      .from("subjects")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deleteSubject: async (id: string): Promise<void> => {
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) throw error;
  },
};
