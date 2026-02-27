import DashboardLayout from "@/components/DashboardLayout";
import { BookOpen, BarChart3, Users, FileText, AlertTriangle, TrendingUp, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

const navItems = [
  { label: "Dashboard", href: "/teacher", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "My Classes", href: "/teacher/classes", icon: <Users className="w-4 h-4" /> },
  { label: "Courses", href: "/teacher/courses", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Assessments", href: "/teacher/assessments", icon: <FileText className="w-4 h-4" /> },
];

const classStats = [
  { label: "Total Students", value: "120", icon: Users },
  { label: "Active Courses", value: "5", icon: BookOpen },
  { label: "Avg. Class Score", value: "72%", icon: TrendingUp },
  { label: "At-Risk Students", value: "8", icon: AlertTriangle },
];

const students = [
  { name: "Ayesha Javaid", course: "Mathematics", score: 92, status: "excellent" },
  { name: "Umy Aiman", course: "Physics", score: 78, status: "good" },
  { name: "Ali Hassan", course: "Computer Science", score: 45, status: "at-risk" },
  { name: "Sara Khan", course: "Mathematics", score: 61, status: "average" },
  { name: "Ahmed Raza", course: "English", score: 38, status: "at-risk" },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "excellent": return "text-primary";
    case "good": return "text-primary";
    case "average": return "text-accent";
    case "at-risk": return "text-destructive";
    default: return "text-muted-foreground";
  }
};

const TeacherDashboard = () => {
  return (
    <DashboardLayout title="Teacher Dashboard" navItems={navItems}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {classStats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-card rounded-xl border border-border p-5">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2"><s.icon className="w-5 h-5 text-primary" /></div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Student Performance</h2>
          <div className="space-y-3">
            {students.map((s) => (
              <div key={s.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">{s.name.charAt(0)}</div>
                  <div><p className="text-sm font-medium">{s.name}</p><p className="text-xs text-muted-foreground">{s.course}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={s.score} className="w-20 h-2" />
                  <span className={`text-sm font-semibold w-10 text-right ${getStatusColor(s.status)}`}>{s.score}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-accent" /> At-Risk Alerts</h2>
            <div className="space-y-3">
              {students.filter(s => s.status === "at-risk").map((s) => (
                <div key={s.name} className="p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.course} — Score: {s.score}% · Needs immediate attention</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" /> Class Overview</h2>
            <div className="space-y-3">
              {[{ cls: "BSIT-A (Mathematics)", avg: 74, students: 35 }, { cls: "BSIT-B (Physics)", avg: 68, students: 30 }, { cls: "BSIT-A (CS)", avg: 82, students: 28 }].map((c) => (
                <div key={c.cls} className="flex items-center justify-between"><div><p className="text-sm font-medium">{c.cls}</p><p className="text-xs text-muted-foreground">{c.students} students</p></div><span className="text-sm font-semibold text-primary">{c.avg}%</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
