import DashboardLayout from "@/components/DashboardLayout";
import { BookOpen, BarChart3, Users, FileText, AlertTriangle, TrendingUp, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useTeacherStats } from "@/hooks/useCourses";
import { Skeleton } from "@/components/ui/skeleton";

const navItems = [
  { label: "Dashboard", href: "/teacher", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "My Classes", href: "/teacher/classes", icon: <Users className="w-4 h-4" /> },
  { label: "Courses", href: "/teacher/courses", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Assessments", href: "/teacher/assessments", icon: <FileText className="w-4 h-4" /> },
  { label: "Analytics", href: "/teacher/analytics", icon: <TrendingUp className="w-4 h-4" /> },
];

const TeacherDashboard = () => {
  const { data: stats, isLoading } = useTeacherStats();

  const classStats = [
    { label: "Total Students", value: stats?.totalStudents?.toString() ?? "0", icon: Users },
    { label: "Active Courses", value: stats?.activeCourses?.toString() ?? "0", icon: BookOpen },
    { label: "Avg. Class Score", value: stats ? `${stats.avgScore}%` : "0%", icon: TrendingUp },
    { label: "At-Risk Students", value: stats?.atRiskCount?.toString() ?? "0", icon: AlertTriangle },
  ];

  return (
    <DashboardLayout title="Teacher Dashboard" navItems={navItems}>
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
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Student Performance</h2>
          <p className="text-sm text-muted-foreground">Create courses and assessments to see student performance data here.</p>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-accent" /> At-Risk Alerts</h2>
            <p className="text-sm text-muted-foreground">Students scoring below 50% will appear here once assessments are taken.</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" /> Class Overview</h2>
            <p className="text-sm text-muted-foreground">Your courses and class stats will appear here.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
