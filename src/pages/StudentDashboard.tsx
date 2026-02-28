import DashboardLayout from "@/components/DashboardLayout";
import { BookOpen, BarChart3, Brain, Award, TrendingUp, Clock, Target, FileText, ClipboardList, Bot } from "lucide-react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { useStudentCourses, useStudentStats } from "@/hooks/useCourses";
import { Skeleton } from "@/components/ui/skeleton";
import AIInsightsPanel from "@/components/AIInsightsPanel";

const navItems = [
  { label: "Dashboard", href: "/student", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "My Courses", href: "/student/courses", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Assessments", href: "/student/assessments", icon: <FileText className="w-4 h-4" /> },
  { label: "Assignments", href: "/student/assignments", icon: <ClipboardList className="w-4 h-4" /> },
  { label: "Progress", href: "/student/progress", icon: <TrendingUp className="w-4 h-4" /> },
  { label: "AI Assistant", href: "/student/ai-chat", icon: <Bot className="w-4 h-4" /> },
];

const StudentDashboard = () => {
  const { data: courses, isLoading: coursesLoading } = useStudentCourses();
  const { data: stats, isLoading: statsLoading } = useStudentStats();

  const statCards = [
    { label: "Courses Enrolled", value: stats?.coursesEnrolled?.toString() ?? "0", icon: BookOpen },
    { label: "Quizzes Taken", value: stats?.quizzesTaken?.toString() ?? "0", icon: Brain },
    { label: "Avg. Score", value: stats ? `${stats.avgScore}%` : "0%", icon: Award },
    { label: "Lessons Done", value: stats?.completedLessons?.toString() ?? "0", icon: Clock },
  ];

  return (
    <DashboardLayout title="Student Dashboard" navItems={navItems}>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card rounded-xl border border-border p-5"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <s.icon className="w-5 h-5 text-primary" />
              </div>
            </div>
            {statsLoading ? <Skeleton className="h-7 w-16 mb-1" /> : <p className="text-2xl font-bold">{s.value}</p>}
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">My Courses</h2>
          {coursesLoading ? (
            <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : courses && courses.length > 0 ? (
            <div className="space-y-4">
              {courses.map((c) => (
                <div key={c.id} className="flex items-center gap-4">
                  <div className="w-2 h-10 rounded-full bg-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-medium text-sm">{c.title}</p>
                      <span className="text-xs text-muted-foreground">{c.completedLessons}/{c.totalLessons} lessons</span>
                    </div>
                    <Progress value={c.progress} className="h-2" />
                  </div>
                  <span className="text-sm font-semibold text-primary w-12 text-right">{c.progress}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No courses enrolled yet. Ask your teacher to enroll you.</p>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" /> AI Insights
          </h2>
          <AIInsightsPanel />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
