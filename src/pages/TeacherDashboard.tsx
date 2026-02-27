import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { BookOpen, BarChart3, Users, FileText, AlertTriangle, TrendingUp, CheckCircle2, Plus, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useTeacherStats } from "@/hooks/useCourses";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/teacher", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "My Classes", href: "/teacher/classes", icon: <Users className="w-4 h-4" /> },
  { label: "Courses", href: "/teacher/courses", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Assessments", href: "/teacher/assessments", icon: <FileText className="w-4 h-4" /> },
  { label: "Analytics", href: "/teacher/analytics", icon: <TrendingUp className="w-4 h-4" /> },
];

const TeacherDashboard = () => {
  const { user } = useAuth();
  const { data: stats, isLoading } = useTeacherStats();

  // Detailed student performance data
  const { data: detailedData, isLoading: detailLoading } = useQuery({
    queryKey: ["teacher-dashboard-details", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get courses
      const { data: courses } = await supabase
        .from("courses")
        .select("id, title, subject, is_published")
        .eq("teacher_id", user!.id);
      const courseIds = (courses || []).map((c) => c.id);
      if (courseIds.length === 0) return { students: [], atRiskStudents: [], courseOverview: [] };

      // Get enrollments with student info
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("student_id, course_id")
        .in("course_id", courseIds);

      const studentIds = [...new Set((enrollments || []).map((e) => e.student_id))];
      if (studentIds.length === 0) return { students: [], atRiskStudents: [], courseOverview: courses || [] };

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", studentIds);
      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.full_name || "Unknown"]));

      // Get assessments & attempts
      const { data: assessments } = await supabase
        .from("assessments")
        .select("id, course_id")
        .in("course_id", courseIds);
      const assessmentIds = (assessments || []).map((a) => a.id);

      let studentScores: { studentId: string; name: string; avgScore: number; attempts: number }[] = [];
      let atRiskStudents: { name: string; score: number; course: string }[] = [];

      if (assessmentIds.length > 0) {
        const { data: attempts } = await supabase
          .from("assessment_attempts")
          .select("student_id, score, total_marks, assessment_id")
          .in("assessment_id", assessmentIds)
          .not("completed_at", "is", null);

        // Group by student
        const byStudent: Record<string, { scores: number[]; assessmentCourses: string[] }> = {};
        (attempts || []).forEach((a) => {
          if (!byStudent[a.student_id]) byStudent[a.student_id] = { scores: [], assessmentCourses: [] };
          const pct = Math.round(((a.score || 0) / (a.total_marks || 1)) * 100);
          byStudent[a.student_id].scores.push(pct);
          const assessment = assessments?.find((as) => as.id === a.assessment_id);
          const course = courses?.find((c) => c.id === assessment?.course_id);
          if (course && pct < 50) {
            atRiskStudents.push({ name: profileMap[a.student_id] || "Unknown", score: pct, course: course.title });
          }
        });

        studentScores = Object.entries(byStudent)
          .map(([sid, data]) => ({
            studentId: sid,
            name: profileMap[sid] || "Unknown",
            avgScore: Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length),
            attempts: data.scores.length,
          }))
          .sort((a, b) => b.avgScore - a.avgScore)
          .slice(0, 10);
      }

      // Course overview with enrollment counts
      const courseOverview = (courses || []).map((c) => {
        const enrolled = (enrollments || []).filter((e) => e.course_id === c.id).length;
        return { ...c, enrolledCount: enrolled };
      });

      return { students: studentScores, atRiskStudents: atRiskStudents.slice(0, 5), courseOverview };
    },
  });

  const classStats = [
    { label: "Total Students", value: stats?.totalStudents?.toString() ?? "0", icon: Users },
    { label: "Active Courses", value: stats?.activeCourses?.toString() ?? "0", icon: BookOpen },
    { label: "Avg. Class Score", value: stats ? `${stats.avgScore}%` : "0%", icon: TrendingUp },
    { label: "At-Risk Students", value: stats?.atRiskCount?.toString() ?? "0", icon: AlertTriangle },
  ];

  const loading = isLoading || detailLoading;

  return (
    <DashboardLayout title="Teacher Dashboard" navItems={navItems}>
      {/* Quick Actions */}
      <div className="flex gap-3 mb-6">
        <Button asChild className="gap-2">
          <Link to="/teacher/courses?create=true"><Plus className="w-4 h-4" /> Create Course</Link>
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/teacher/assessments"><FileText className="w-4 h-4" /> Assessments</Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {classStats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-card rounded-xl border border-border p-5">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2"><s.icon className="w-5 h-5 text-primary" /></div>
            {isLoading ? <Skeleton className="h-7 w-16 mb-1" /> : <p className="text-2xl font-bold">{s.value}</p>}
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Student Performance */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Top Student Performance</h2>
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : detailedData?.students && detailedData.students.length > 0 ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {detailedData.students.map((s, i) => (
                <motion.div key={s.studentId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3">
                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", s.avgScore >= 50 ? "bg-primary/10" : "bg-destructive/10")}>
                    {s.avgScore >= 50 ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <XCircle className="w-4 h-4 text-destructive" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <span className={cn("text-sm font-semibold", s.avgScore >= 50 ? "text-primary" : "text-destructive")}>{s.avgScore}%</span>
                    </div>
                    <Progress value={s.avgScore} className="h-1.5" />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Create courses and assessments to see student performance data here.</p>
          )}
        </div>

        <div className="space-y-6">
          {/* At-Risk Alerts */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" /> At-Risk Alerts</h2>
            {loading ? (
              <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : detailedData?.atRiskStudents && detailedData.atRiskStudents.length > 0 ? (
              <div className="space-y-2">
                {detailedData.atRiskStudents.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-destructive/5">
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.course}</p>
                    </div>
                    <Badge variant="destructive" className="text-xs">{s.score}%</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No at-risk students. Students scoring below 50% will appear here.</p>
            )}
          </div>

          {/* Class Overview */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" /> Class Overview</h2>
            {loading ? (
              <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : detailedData?.courseOverview && detailedData.courseOverview.length > 0 ? (
              <div className="space-y-2">
                {detailedData.courseOverview.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground">{c.subject || "No subject"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-xs">{c.enrolledCount} students</Badge>
                      {c.is_published ? <Badge variant="default" className="text-xs">Published</Badge> : <Badge variant="outline" className="text-xs">Draft</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No courses yet. Create your first course!</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
