import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Feedback {
  id: string;
  student_id: string;
  course_id: string;
  lesson_id: string | null;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
}

export function useFeedback(courseId: string, lessonId?: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const feedbackKey = ["student-feedback", courseId, lessonId ?? "course"];

  const { data: feedback, isLoading } = useQuery({
    queryKey: feedbackKey,
    enabled: !!user && !!courseId,
    queryFn: async () => {
      let query = supabase
        .from("student_feedback")
        .select("*")
        .eq("student_id", user!.id)
        .eq("course_id", courseId);

      if (lessonId) {
        query = query.eq("lesson_id", lessonId);
      } else {
        query = query.is("lesson_id", null);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data as Feedback | null;
    },
  });

  const submitFeedback = useMutation({
    mutationFn: async ({ rating, comment }: { rating: number; comment: string }) => {
      const payload = {
        student_id: user!.id,
        course_id: courseId,
        lesson_id: lessonId ?? null,
        rating,
        comment: comment.trim(),
      };

      if (feedback?.id) {
        const { error } = await supabase
          .from("student_feedback")
          .update({ rating, comment: comment.trim() })
          .eq("id", feedback.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("student_feedback")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedbackKey });
      toast.success(feedback ? "Feedback updated!" : "Thanks for your feedback!");
    },
    onError: () => {
      toast.error("Failed to submit feedback");
    },
  });

  return { feedback, isLoading, submitFeedback };
}
