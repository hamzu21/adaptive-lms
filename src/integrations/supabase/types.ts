export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      assessment_attempts: {
        Row: {
          assessment_id: string
          completed_at: string | null
          difficulty_progression: Json | null
          id: string
          is_adaptive: boolean
          score: number | null
          started_at: string
          student_id: string
          total_marks: number | null
        }
        Insert: {
          assessment_id: string
          completed_at?: string | null
          difficulty_progression?: Json | null
          id?: string
          is_adaptive?: boolean
          score?: number | null
          started_at?: string
          student_id: string
          total_marks?: number | null
        }
        Update: {
          assessment_id?: string
          completed_at?: string | null
          difficulty_progression?: Json | null
          id?: string
          is_adaptive?: boolean
          score?: number | null
          started_at?: string
          student_id?: string
          total_marks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_attempts_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          course_id: string
          created_at: string
          description: string
          id: string
          is_published: boolean
          title: string
          total_marks: number
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string
          id?: string
          is_published?: boolean
          title: string
          total_marks?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string
          id?: string
          is_published?: boolean
          title?: string
          total_marks?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          feedback: string | null
          file_name: string | null
          file_url: string | null
          graded_at: string | null
          id: string
          score: number | null
          student_id: string
          submission_text: string | null
          submitted_at: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          feedback?: string | null
          file_name?: string | null
          file_url?: string | null
          graded_at?: string | null
          id?: string
          score?: number | null
          student_id: string
          submission_text?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          feedback?: string | null
          file_name?: string | null
          file_url?: string | null
          graded_at?: string | null
          id?: string
          score?: number | null
          student_id?: string
          submission_text?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          course_id: string
          created_at: string
          description: string
          due_date: string | null
          id: string
          is_published: boolean
          title: string
          total_marks: number
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          is_published?: boolean
          title: string
          total_marks?: number
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          is_published?: boolean
          title?: string
          total_marks?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_responses: {
        Row: {
          attempt_id: string
          difficulty_level: string | null
          id: string
          is_correct: boolean
          question_id: string
          selected_option: number | null
        }
        Insert: {
          attempt_id: string
          difficulty_level?: string | null
          id?: string
          is_correct?: boolean
          question_id: string
          selected_option?: number | null
        }
        Update: {
          attempt_id?: string
          difficulty_level?: string | null
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_option?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attempt_responses_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          course_name: string | null
          created_at: string
          id: string
          lesson_title: string | null
          student_id: string
          title: string
          updated_at: string
        }
        Insert: {
          course_name?: string | null
          created_at?: string
          id?: string
          lesson_title?: string | null
          student_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          course_name?: string | null
          created_at?: string
          id?: string
          lesson_title?: string | null
          student_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          description: string
          id: string
          is_published: boolean
          subject: string
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_published?: boolean
          subject?: string
          teacher_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_published?: boolean
          subject?: string
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          id: string
          student_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          id?: string
          student_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          id: string
          lesson_id: string
          student_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          lesson_id: string
          student_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          lesson_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: string
          course_id: string
          created_at: string
          id: string
          position: number
          title: string
          updated_at: string
          video_file_url: string
          video_url: string
        }
        Insert: {
          content?: string
          course_id: string
          created_at?: string
          id?: string
          position?: number
          title: string
          updated_at?: string
          video_file_url?: string
          video_url?: string
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string
          id?: string
          position?: number
          title?: string
          updated_at?: string
          video_file_url?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      parent_children: {
        Row: {
          child_id: string
          created_at: string
          id: string
          parent_id: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          parent_id: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          parent_id?: string
        }
        Relationships: []
      }
      parent_invite_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          student_id: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          student_id: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          student_id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          expertise: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          expertise?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          expertise?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          assessment_id: string
          correct_option: number
          difficulty: string
          id: string
          marks: number
          options: Json
          position: number
          question_text: string
        }
        Insert: {
          assessment_id: string
          correct_option: number
          difficulty?: string
          id?: string
          marks?: number
          options: Json
          position?: number
          question_text: string
        }
        Update: {
          assessment_id?: string
          correct_option?: number
          difficulty?: string
          id?: string
          marks?: number
          options?: Json
          position?: number
          question_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      student_feedback: {
        Row: {
          comment: string
          course_id: string
          created_at: string
          id: string
          lesson_id: string | null
          rating: number
          student_id: string
          updated_at: string
        }
        Insert: {
          comment?: string
          course_id: string
          created_at?: string
          id?: string
          lesson_id?: string | null
          rating: number
          student_id: string
          updated_at?: string
        }
        Update: {
          comment?: string
          course_id?: string
          created_at?: string
          id?: string
          lesson_id?: string | null
          rating?: number
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_feedback_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_feedback_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      student_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          lesson_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          lesson_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lesson_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_notes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_student_by_name: { Args: { _name: string }; Returns: string }
      get_quiz_questions: {
        Args: { _assessment_id: string }
        Returns: {
          out_difficulty: string
          out_id: string
          out_marks: number
          out_options: Json
          out_position: number
          out_question_text: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_assessment_teacher: {
        Args: { _assessment_id: string; _user_id: string }
        Returns: boolean
      }
      is_assignment_course_teacher: {
        Args: { _assignment_id: string; _user_id: string }
        Returns: boolean
      }
      is_course_teacher: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      is_enrolled: {
        Args: { _course_id: string; _student_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "teacher" | "parent" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["student", "teacher", "parent", "admin"],
    },
  },
} as const
