export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      exam_attempts: {
        Row: {
          anon_secret: string | null;
          answers: Json;
          created_at: string;
          exam_id: string;
          id: string;
          is_finished: boolean;
          score: number | null;
          started_at: string;
          student_id: string | null;
          student_name: string;
          submitted_at: string | null;
        };
        Insert: {
          anon_secret?: string | null;
          answers?: Json;
          created_at?: string;
          exam_id: string;
          id?: string;
          is_finished?: boolean;
          score?: number | null;
          started_at?: string;
          student_id?: string | null;
          student_name?: string;
          submitted_at?: string | null;
        };
        Update: {
          anon_secret?: string | null;
          answers?: Json;
          created_at?: string;
          exam_id?: string;
          id?: string;
          is_finished?: boolean;
          score?: number | null;
          started_at?: string;
          student_id?: string | null;
          student_name?: string;
          submitted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey";
            columns: ["exam_id"];
            isOneToOne: false;
            referencedRelation: "exams";
            referencedColumns: ["id"];
          },
        ];
      };
      exam_questions: {
        Row: {
          exam_id: string;
          order_index: number;
          question_id: string;
        };
        Insert: {
          exam_id: string;
          order_index?: number;
          question_id: string;
        };
        Update: {
          exam_id?: string;
          order_index?: number;
          question_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exam_questions_exam_id_fkey";
            columns: ["exam_id"];
            isOneToOne: false;
            referencedRelation: "exams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exam_questions_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
        ];
      };
      exams: {
        Row: {
          allow_retry: boolean;
          created_at: string;
          created_by: string;
          duration: number;
          exam_code: string;
          id: string;
          max_attempts: number;
          published: boolean;
          show_answer: boolean;
          subject_id: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          allow_retry?: boolean;
          created_at?: string;
          created_by: string;
          duration?: number;
          exam_code: string;
          id?: string;
          max_attempts?: number;
          published?: boolean;
          show_answer?: boolean;
          subject_id?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          allow_retry?: boolean;
          created_at?: string;
          created_by?: string;
          duration?: number;
          exam_code?: string;
          id?: string;
          max_attempts?: number;
          published?: boolean;
          show_answer?: boolean;
          subject_id?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exams_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string;
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          full_name?: string;
          id: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string;
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          content: string;
          correct_answer: number;
          created_at: string;
          created_by: string;
          explanation: string | null;
          id: string;
          options: Json;
          subject_id: string;
          updated_at: string;
        };
        Insert: {
          content: string;
          correct_answer: number;
          created_at?: string;
          created_by: string;
          explanation?: string | null;
          id?: string;
          options: Json;
          subject_id: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          correct_answer?: number;
          created_at?: string;
          created_by?: string;
          explanation?: string | null;
          id?: string;
          options?: Json;
          subject_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "questions_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
        ];
      };
      subjects: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          subject_code: string;
          teacher_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          subject_code?: string;
          teacher_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          subject_code?: string;
          teacher_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      vw_top_subjects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          subject_code: string;
          teacher_id: string;
          created_at: string;
          attempts_count: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_exam_attempt: {
        Args: {
          attempt_id: string;
          secret?: string | null;
        };
        Returns: {
          id: string;
          exam_id: string;
          student_id: string | null;
          student_name: string;
          anon_secret: string | null;
          answers: Json;
          score: number | null;
          is_finished: boolean;
          started_at: string;
          submitted_at: string | null;
          created_at: string;
          exams: { title: string };
        }[];
      };
      get_active_exam_attempt: {
        Args: {
          p_exam_id: string;
          p_secret?: string | null;
        };
        Returns: {
          id: string;
          exam_id: string;
          student_id: string | null;
          student_name: string;
          anon_secret: string | null;
          answers: Json;
          score: number | null;
          is_finished: boolean;
          started_at: string;
          submitted_at: string | null;
          created_at: string;
        }[];
      };
      start_attempt: {
        Args: {
          p_exam_id: string;
          p_student_name: string;
          p_secret?: string | null;
        };
        Returns: {
          id: string;
          exam_id: string;
          student_id: string | null;
          student_name: string;
          anon_secret: string | null;
          answers: Json;
          score: number | null;
          is_finished: boolean;
          started_at: string;
          submitted_at: string | null;
          created_at: string;
        }[];
      };
      save_attempt_progress: {
        Args: {
          p_attempt_id: string;
          p_answers: Json;
          p_secret?: string | null;
        };
        Returns: undefined;
      };
      submit_exam_attempt: {
        Args: {
          attempt_id: string;
          user_answers: Json;
          secret?: string | null;
        };
        Returns: undefined;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: "teacher" | "student";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      user_role: ["teacher", "student"],
    },
  },
} as const;
