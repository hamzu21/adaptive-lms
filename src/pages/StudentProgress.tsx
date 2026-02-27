import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { BookOpen, BarChart3, FileText, TrendingUp, Award, Brain, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const navItems = [
  { label: "Dashboard", href: "/student", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "My Courses", href: "/student/courses", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Assessments", href: "/student/assessments", icon: <FileText className="w-4 h-4" /> },
  { label: "Progress", href: "/student/progress", icon: <TrendingUp className="w-4 h-4" /> },
];

const StudentProgress = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["student-progress", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const userId = user!.id;

      // Enrollments + courses
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("course_id, enrolled_at, courses(id, title, subject)")
        .eq("student_id", userId);

      const courseIds = (enrollments || []).map((e) => e.course_id);

      // All lessons for enrolled courses
      const { data: lessons } = courseIds.length > 0
        ? await supabase.from("lessons").select("id, course_id").in("course_id", courseIds)
        : { data: [] };

      // Completed lessons
      const { data: lessonProgress } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed, completed_at")
        .eq("student_id", userId)
        .eq("completed", true);

      const completedSet = new Set((lessonProgress || []).map((p) => p.lesson_id));

      // Course completion stats
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
        return {
          id: course.id,
          title: course.title,
          subject: course.subject,
          completedLessons: completed,
          totalLessons: total,
          progress: total > 0 ? Math.round((completed / total) * 100) : 0,
          enrolledAt: e.enrolled_at,
        };
      });

      // Quiz history
      const { data: attempts } = await supabase
        .from("assessment_attempts")
        .select("id, score, total_marks, completed_at, assessment_id, assessments(title, course_id, courses(title))")
        .eq("student_id", userId)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false });

      const quizHistory = (attempts || []).map((a: any) => {
        const pct = Math.round(((a.score || 0) / (a.total_marks || 1)) * 100);
        return {
          id: a.id,
          assessmentTitle: a.assessments?.title || "Unknown",
          courseName: a.assessments?.courses?.title || "Unknown",
          score: a.score || 0,
          totalMarks: a.total_marks || 0,
          percentage: pct,
          passed: pct >= 50,
          completedAt: a.completed_at,
        };
      });

      // Overall stats
      const totalLessons = (lessons || []).length;
      const completedLessons = completedSet.size;
      const totalQuizzes = quizHistory.length;
      const avgQuizScore = totalQuizzes > 0
        ? Math.round(quizHistory.reduce((s, q) => s + q.percentage, 0) / totalQuizzes)
        : 0;
      const passedQuizzes = quizHistory.filter((q) => q.passed).length;
      const overallCompletion = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      // Completion trend (lessons completed per day, last 14 days)
      const now = new Date();
      const trendDays = 14;
      const dayBuckets: { date: string; count: number }[] = [];
      for (let i = trendDays - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        dayBuckets.push({ date: format(d, "MMM d"), count: 0 });
      }
      (lessonProgress || []).forEach((p: any) => {
        if (!p.completed_at) return;
        const d = format(new Date(p.completed_at), "MMM d");
        const bucket = dayBuckets.find((b) => b.date === d);
        if (bucket) bucket.count++;
      });

      return {
        courseStats,
        quizHistory,
        totalLessons,
        completedLessons,
        totalQuizzes,
        avgQuizScore,
        passedQuizzes,
        overallCompletion,
        totalCourses: courseIds.length,
        trend: dayBuckets,
      };
    },
  });

  const statCards = [
    { label: "Courses", value: data?.totalCourses?.toString() ?? "0", icon: BookOpen },
    { label: "Lessons Done", value: `${data?.completedLessons ?? 0}/${data?.totalLessons ?? 0}`, icon: CheckCircle2 },
    { label: "Quizzes Taken", value: data?.totalQuizzes?.toString() ?? "0", icon: Brain },
    { label: "Avg. Quiz Score", value: data ? `${data.avgQuizScore}%` : "0%", icon: Award },
  ];

  const maxTrend = Math.max(...(data?.trend?.map((t) => t.count) || [1]), 1);

  return (
    <DashboardLayout title="My Progress" navItems={navItems}>
      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-xl border border-border p-5"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Activity trend */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-xl border border-border p-6"
          >
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Lesson Activity (Last 14 Days)
            </h3>
            <div className="flex items-end gap-1.5 h-28">
              {data.trend.map((t, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      "w-full rounded-t-sm transition-all min-h-[2px]",
                      t.count > 0 ? "bg-primary" : "bg-secondary"
                    )}
                    style={{ height: `${(t.count / maxTrend) * 100}%` }}
                    title={`${t.date}: ${t.count} lesson${t.count !== 1 ? "s" : ""}`}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-1.5 mt-1">
              {data.trend.map((t, i) => (
                <div key={i} className="flex-1 text-center">
                  <span className="text-[9px] text-muted-foreground">{i % 2 === 0 ? t.date.split(" ")[1] : ""}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Course completion */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-card rounded-xl border border-border p-6"
            >
              <h3 className="font-semibold mb-4">Course Completion</h3>
              {data.courseStats.length > 0 ? (
                <div className="space-y-4">
                  {data.courseStats.map((c) => (
                    <div key={c.id}>
                      <div className="flex justify-between items-center mb-1">
                        <div>
                          <p className="text-sm font-medium">{c.title}</p>
                          <p className="text-xs text-muted-foreground">{c.subject}</p>
                        </div>
                        <span className="text-sm font-semibold text-primary">{c.progress}%</span>
                      </div>
                      <Progress value={c.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.completedLessons}/{c.totalLessons} lessons
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No courses enrolled yet.</p>
              )}
            </motion.div>

            {/* Quiz history */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card rounded-xl border border-border p-6"
            >
              <h3 className="font-semibold mb-4">Quiz History</h3>
              {data.quizHistory.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {data.quizHistory.map((q) => (
                    <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        q.passed ? "bg-primary/10" : "bg-destructive/10"
                      )}>
                        {q.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{q.assessmentTitle}</p>
                        <p className="text-xs text-muted-foreground">{q.courseName}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn("text-sm font-semibold", q.passed ? "text-primary" : "text-destructive")}>
                          {q.percentage}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(q.completedAt), "MMM d")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No quizzes taken yet.</p>
              )}
            </motion.div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
};

export default StudentProgress;
