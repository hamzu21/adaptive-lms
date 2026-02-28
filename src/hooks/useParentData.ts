import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useParentChildren() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["parent-children", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: links, error } = await supabase
        .from("parent_children")
        .select("child_id")
        .eq("parent_id", user!.id);
      if (error) throw error;
      if (!links || links.length === 0) return [];

      const childIds = links.map((l) => l.child_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", childIds);

      return (profiles || []).map((p) => ({
        id: p.user_id,
        name: p.full_name || "Unknown",
        avatarUrl: p.avatar_url,
      }));
    },
  });
}

export function useAddChildByCode() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const trimmedCode = code.trim().toUpperCase();
      if (!trimmedCode || trimmedCode.length !== 8) {
        throw new Error("Please enter a valid 8-character invite code.");
      }

      // Look up the invite code
      const { data: invite, error: lookupErr } = await supabase
        .from("parent_invite_codes")
        .select("id, student_id, expires_at, used_by")
        .eq("code", trimmedCode)
        .maybeSingle();

      if (lookupErr) throw lookupErr;
      if (!invite) throw new Error("Invalid invite code. Please check and try again.");
      if (invite.used_by) throw new Error("This invite code has already been used.");
      if (new Date(invite.expires_at) < new Date()) throw new Error("This invite code has expired. Ask your child to generate a new one.");

      // Check not already linked
      const { data: existing } = await supabase
        .from("parent_children")
        .select("id")
        .eq("parent_id", user!.id)
        .eq("child_id", invite.student_id)
        .maybeSingle();
      if (existing) throw new Error("This child is already linked to your account.");

      // Link the child
      const { error: linkErr } = await supabase
        .from("parent_children")
        .insert({ parent_id: user!.id, child_id: invite.student_id });
      if (linkErr) throw linkErr;

      // Mark code as used
      await supabase
        .from("parent_invite_codes")
        .update({ used_by: user!.id, used_at: new Date().toISOString() })
        .eq("id", invite.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-children"] });
      queryClient.invalidateQueries({ queryKey: ["parent-child-performance"] });
    },
  });
}

export function useRemoveChild() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (childId: string) => {
      const { error } = await supabase
        .from("parent_children")
        .delete()
        .eq("parent_id", user!.id)
        .eq("child_id", childId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-children"] });
      queryClient.invalidateQueries({ queryKey: ["parent-child-performance"] });
    },
  });
}

// Hook for students to generate invite codes
export function useGenerateInviteCode() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      // Generate a random 8-character alphanumeric code
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 to avoid confusion
      let code = "";
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { data, error } = await supabase
        .from("parent_invite_codes")
        .insert({
          student_id: user.id,
          code,
          expires_at: expiresAt.toISOString(),
        })
        .select("code, expires_at")
        .single();

      if (error) throw error;
      return data;
    },
  });
}

export function useChildPerformance(childId: string | null) {
  return useQuery({
    queryKey: ["parent-child-performance", childId],
    enabled: !!childId,
    queryFn: async () => {
      // Enrollments + courses
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("course_id, enrolled_at, courses(id, title, subject)")
        .eq("student_id", childId!);

      const courseIds = (enrollments || []).map((e) => e.course_id);

      // Lessons
      const { data: lessons } = courseIds.length > 0
        ? await supabase.from("lessons").select("id, course_id").in("course_id", courseIds)
        : { data: [] };

      // Lesson progress
      const { data: progress } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed")
        .eq("student_id", childId!)
        .eq("completed", true);

      const completedSet = new Set((progress || []).map((p) => p.lesson_id));
      const lessonsByCourse: Record<string, string[]> = {};
      (lessons || []).forEach((l: any) => {
        if (!lessonsByCourse[l.course_id]) lessonsByCourse[l.course_id] = [];
        lessonsByCourse[l.course_id].push(l.id);
      });

      const courseStats = (enrollments || []).map((e: any) => {
        const course = e.courses as any;
        const courseLessons = lessonsByCourse[e.course_id] || [];
        const completed = courseLessons.filter((id) => completedSet.has(id)).length;
        const total = courseLessons.length;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { id: course.id, title: course.title, subject: course.subject, progress: pct, completedLessons: completed, totalLessons: total };
      });

      // Assessment attempts
      const { data: attempts } = await supabase
        .from("assessment_attempts")
        .select("id, score, total_marks, completed_at, assessment_id, assessments(title, course_id, courses(title))")
        .eq("student_id", childId!)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(10);

      const quizHistory = (attempts || []).map((a: any) => {
        const pct = Math.round(((a.score || 0) / (a.total_marks || 1)) * 100);
        return {
          id: a.id,
          title: a.assessments?.title || "Unknown",
          courseName: a.assessments?.courses?.title || "",
          score: a.score || 0,
          totalMarks: a.total_marks || 0,
          percentage: pct,
          passed: pct >= 50,
          completedAt: a.completed_at,
        };
      });

      const totalQuizzes = quizHistory.length;
      const avgScore = totalQuizzes > 0
        ? Math.round(quizHistory.reduce((s, q) => s + q.percentage, 0) / totalQuizzes)
        : 0;
      const overallProgress = courseStats.length > 0
        ? Math.round(courseStats.reduce((s, c) => s + c.progress, 0) / courseStats.length)
        : 0;

      return { courseStats, quizHistory, avgScore, overallProgress, totalCourses: courseIds.length, totalQuizzes };
    },
  });
}
