import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LearningPathItem {
  courseId: string;
  courseName: string;
  lessonId: string;
  lessonTitle: string;
  reason: string;
  difficulty: "review" | "standard" | "challenge";
  urgency: "high" | "medium" | "low";
}

export interface DifficultyProfile {
  level: "beginner" | "intermediate" | "advanced";
  description: string;
  adjustmentNote: string;
}

export interface Analysis {
  strengths?: { topic: string; reason: string }[];
  weaknesses?: { topic: string; reason: string }[];
  recommendations?: { title: string; description: string; priority: string }[];
  summary?: string;
  learningPath?: LearningPathItem[];
  difficultyProfile?: DifficultyProfile;
  error?: string;
  details?: string;
  is_debug_error?: boolean;
}

export function useAIAnalysis() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ai-analysis", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Analysis> => {
      const { data, error } = await supabase.functions.invoke("ai-analyze");
      if (error) {
        console.error("AI Analysis error:", error);
        throw new Error(error.message || "Failed to analyze");
      }
      return data;
    },
  });
}
