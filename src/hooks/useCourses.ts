import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface EnrolledCourse {
  id: string;
  title: string;
  subject: string;
  totalLessons: number;
  completedLessons: number;
  progress: number;
}

export function useStudentCourses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["student-courses", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<EnrolledCourse[]> => {
      // Get enrollments with course info
      const { data: enrollments, error: eErr } = await supabase
        .from("enrollments")
        .select("course_id, courses(id, title, subject)")
        .eq("student_id", user!.id);
      if (eErr) throw eErr;
      if (!enrollments || enrollments.length === 0) return [];

      const courseIds = enrollments.map((e: any) => e.course_id);

      // Get all lessons for these courses
      const { data: lessons } = await supabase
        .from("lessons")
        .select("id, course_id")
        .in("course_id", courseIds);

      // Get completed lessons
      const { data: progress } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed")
        .eq("student_id", user!.id)
        .eq("completed", true);

      const lessonsByCourse: Record<string, string[]> = {};
      (lessons || []).forEach((l: any) => {
        if (!lessonsByCourse[l.course_id]) lessonsByCourse[l.course_id] = [];
        lessonsByCourse[l.course_id].push(l.id);
      });

      const completedSet = new Set((progress || []).map((p: any) => p.lesson_id));

      return enrollments.map((e: any) => {
        const course = e.courses as any;
        const courseLessons = lessonsByCourse[e.course_id] || [];
        const completed = courseLessons.filter((id) => completedSet.has(id)).length;
        const total = courseLessons.length;
        return {
          id: course.id,
          title: course.title,
          subject: course.subject,
          totalLessons: total,
          completedLessons: completed,
          progress: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      });
    },
  });
}

export function useStudentStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["student-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [enrollRes, attemptsRes, progressRes] = await Promise.all([
        supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("student_id", user!.id),
        supabase.from("assessment_attempts").select("score, total_marks").eq("student_id", user!.id).not("completed_at", "is", null),
        supabase.from("lesson_progress").select("id", { count: "exact", head: true }).eq("student_id", user!.id).eq("completed", true),
      ]);

      const coursesEnrolled = enrollRes.count || 0;
      const attempts = attemptsRes.data || [];
      const quizzesTaken = attempts.length;
      const avgScore = quizzesTaken > 0
        ? Math.round(attempts.reduce((sum, a) => sum + ((a.score || 0) / (a.total_marks || 1)) * 100, 0) / quizzesTaken)
        : 0;
      const completedLessons = progressRes.count || 0;

      return { coursesEnrolled, quizzesTaken, avgScore, completedLessons };
    },
  });
}

export function useTeacherCourses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["teacher-courses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, subject, is_published")
        .eq("teacher_id", user!.id);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useTeacherStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["teacher-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get teacher's courses
      const { data: courses } = await supabase
        .from("courses")
        .select("id")
        .eq("teacher_id", user!.id);
      const courseIds = (courses || []).map((c) => c.id);
      if (courseIds.length === 0) return { totalStudents: 0, activeCourses: 0, avgScore: 0, atRiskCount: 0, students: [] };

      // Count enrollments
      const { count: totalStudents } = await supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .in("course_id", courseIds);

      // Get attempts for these courses via assessments
      const { data: assessments } = await supabase
        .from("assessments")
        .select("id")
        .in("course_id", courseIds);
      const assessmentIds = (assessments || []).map((a) => a.id);

      let students: { name: string; course: string; score: number; status: string }[] = [];
      let avgScore = 0;
      let atRiskCount = 0;

      if (assessmentIds.length > 0) {
        const { data: attempts } = await supabase
          .from("assessment_attempts")
          .select("student_id, score, total_marks, assessment_id")
          .in("assessment_id", assessmentIds)
          .not("completed_at", "is", null);

        if (attempts && attempts.length > 0) {
          const scores = attempts.map((a) => ((a.score || 0) / (a.total_marks || 1)) * 100);
          avgScore = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
          atRiskCount = scores.filter((s) => s < 50).length;
        }
      }

      return {
        totalStudents: totalStudents || 0,
        activeCourses: courseIds.length,
        avgScore,
        atRiskCount,
      };
    },
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [usersRes, coursesRes, studentsRes, teachersRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "teacher"),
      ]);
      return {
        totalUsers: usersRes.count || 0,
        activeCourses: coursesRes.count || 0,
        students: studentsRes.count || 0,
        teachers: teachersRes.count || 0,
      };
    },
  });
}
