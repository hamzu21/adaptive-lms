import DashboardLayout from "@/components/DashboardLayout";
import { BookOpen, BarChart3, Brain, Award, TrendingUp, Clock, Target, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

const navItems = [
  { label: "Dashboard", href: "/student", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "My Courses", href: "/student/courses", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Assessments", href: "/student/assessments", icon: <FileText className="w-4 h-4" /> },
  { label: "Progress", href: "/student/progress", icon: <TrendingUp className="w-4 h-4" /> },
];

const courses = [
  { name: "Mathematics", progress: 72, lessons: 24, completed: 17, color: "bg-primary" },
  { name: "Physics", progress: 45, lessons: 18, completed: 8, color: "bg-accent" },
  { name: "Computer Science", progress: 88, lessons: 30, completed: 26, color: "bg-primary" },
  { name: "English", progress: 60, lessons: 20, completed: 12, color: "bg-accent" },
];

const recommendations = [
  { topic: "Quadratic Equations", reason: "Weak area detected", subject: "Mathematics" },
  { topic: "Newton's Laws", reason: "Incomplete lesson", subject: "Physics" },
  { topic: "Data Structures", reason: "Ready for next level", subject: "Computer Science" },
];

const stats = [
  { label: "Courses Enrolled", value: "4", icon: BookOpen },
  { label: "Quizzes Taken", value: "28", icon: Brain },
  { label: "Avg. Score", value: "76%", icon: Award },
  { label: "Study Hours", value: "42h", icon: Clock },
];

const StudentDashboard = () => {
  return (
    <DashboardLayout title="Student Dashboard" navItems={navItems}>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s, i) => (
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
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">My Courses</h2>
          <div className="space-y-4">
            {courses.map((c) => (
              <div key={c.name} className="flex items-center gap-4">
                <div className={`w-2 h-10 rounded-full ${c.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-medium text-sm">{c.name}</p>
                    <span className="text-xs text-muted-foreground">{c.completed}/{c.lessons} lessons</span>
                  </div>
                  <Progress value={c.progress} className="h-2" />
                </div>
                <span className="text-sm font-semibold text-primary w-12 text-right">{c.progress}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" /> AI Recommendations
          </h2>
          <div className="space-y-3">
            {recommendations.map((r) => (
              <div key={r.topic} className="p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors cursor-pointer">
                <p className="font-medium text-sm">{r.topic}</p>
                <p className="text-xs text-muted-foreground">{r.subject} · {r.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
